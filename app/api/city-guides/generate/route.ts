import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { upsertCityByName } from '@/lib/city-upsert'
import { baseSlugFromCity } from '@/lib/city-guide-slug'
import { randomBytes } from 'crypto'
import { cityGuideInclude, cityToGuideDto } from '@/lib/city-as-guide-dto'

export const dynamic = 'force-dynamic'

const SYSTEM = `You are a concise travel editor. Given a city, return ONLY valid JSON with this shape:
{
  "tagline": "one short hook line",
  "description": "2-4 sentences on what to do and why visit",
  "bestTimeToVisit": "when to go (seasons or months, one short phrase)",
  "attractionNames": ["5-12 short names of things to see/do — no long sentences"]
}
Rules: real places only; attractionNames are labels the user might save as catalogue items later. No markdown outside JSON.`

async function uniqueCitySlug(name: string, state: string | null, country: string) {
  let base = baseSlugFromCity(name, state, country)
  for (let i = 0; i < 8; i++) {
    const citySlug = i === 0 ? base : `${base}-${randomBytes(3).toString('hex')}`
    const taken = await prisma.city.findUnique({ where: { citySlug } })
    if (!taken) return citySlug
  }
  return `${base}-${randomBytes(4).toString('hex')}`
}

/**
 * POST /api/city-guides/generate
 * Body: { cityName, state?, country?, travelerId?, persist?: boolean }
 * If persist true, upserts City + sets guide fields + citySlug (409 if guide already exists for city).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      cityName,
      state,
      country = 'USA',
      travelerId,
      persist = false,
    } = body as Record<string, unknown>

    if (!cityName || typeof cityName !== 'string' || !cityName.trim()) {
      return NextResponse.json({ error: 'cityName is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 503 })
    }

    const stateVal = typeof state === 'string' && state.trim() ? state.trim() : null
    const countryStr = typeof country === 'string' && country.trim() ? country.trim() : 'USA'

    const placeLabel = `${cityName.trim()}${stateVal ? `, ${stateVal}` : ''}, ${countryStr}`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Destination: ${placeLabel}` },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('OpenAI city-guide generate error:', res.status, err)
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 })
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 })
    }

    let parsed: {
      tagline?: string
      description?: string
      bestTimeToVisit?: string
      attractionNames?: string[]
    }
    try {
      parsed = JSON.parse(content) as typeof parsed
    } catch {
      return NextResponse.json({ error: 'Invalid AI JSON' }, { status: 502 })
    }

    const tagline = typeof parsed.tagline === 'string' ? parsed.tagline.trim() : ''
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : ''
    const bestTimeToVisit =
      typeof parsed.bestTimeToVisit === 'string' ? parsed.bestTimeToVisit.trim() : ''
    const attractionNames = Array.isArray(parsed.attractionNames)
      ? parsed.attractionNames
          .filter((s): s is string => typeof s === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    if (!description && attractionNames.length === 0) {
      return NextResponse.json({ error: 'AI returned no usable content' }, { status: 502 })
    }

    const generated = {
      tagline: tagline || null,
      description: description || null,
      bestTimeToVisit: bestTimeToVisit || null,
      attractionNames,
    }

    if (!persist) {
      return NextResponse.json({ generated })
    }

    const city = await upsertCityByName({
      name: cityName.trim(),
      state: stateVal,
      country: countryStr,
    })

    if (city.citySlug) {
      const existingDto = cityToGuideDto(
        await prisma.city.findUniqueOrThrow({
          where: { id: city.id },
          include: cityGuideInclude,
        })
      )
      return NextResponse.json(
        { error: 'Guide already exists for this city', guide: existingDto, generated },
        { status: 409 }
      )
    }

    const citySlug = await uniqueCitySlug(city.name, city.state, city.country ?? 'USA')

    const updated = await prisma.city.update({
      where: { id: city.id },
      data: {
        citySlug,
        tagline: generated.tagline,
        description: generated.description,
        bestTimeToVisit: generated.bestTimeToVisit,
        attractionNames: generated.attractionNames,
        guideCreatedById:
          typeof travelerId === 'string' && travelerId.trim() ? travelerId.trim() : null,
      },
      include: cityGuideInclude,
    })

    const guide = cityToGuideDto(updated)
    return NextResponse.json({ guide, generated }, { status: 201 })
  } catch (error) {
    console.error('city-guides generate error:', error)
    return NextResponse.json({ error: 'Failed to generate city guide' }, { status: 500 })
  }
}
