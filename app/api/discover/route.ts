import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { upsertCityByName } from '@/lib/city-upsert'

export const dynamic = 'force-dynamic'

export type DiscoverType =
  | 'concert'
  | 'hike'
  | 'dining'
  | 'attraction'
  | 'day_trip'

interface Suggestion {
  name: string
  subtitle?: string
  detail?: string
  url?: string
  notes?: string
  difficulty?: string
  distanceMi?: number
  durationMin?: number
}

const VALID_TYPES: DiscoverType[] = [
  'concert',
  'hike',
  'dining',
  'attraction',
  'day_trip',
]

function resolveHikeMetrics(s: Suggestion): {
  difficulty: string | null
  distanceMi: number | null
  durationMin: number | null
} {
  let difficulty: string | null =
    typeof s.difficulty === 'string' && s.difficulty.trim()
      ? s.difficulty.trim()
      : null
  let distanceMi: number | null =
    typeof s.distanceMi === 'number' && Number.isFinite(s.distanceMi)
      ? s.distanceMi
      : null
  let durationMin: number | null =
    typeof s.durationMin === 'number' && Number.isFinite(s.durationMin)
      ? Math.round(s.durationMin)
      : null

  const detail = s.detail?.trim() ?? ''
  const notes = s.notes?.trim() ?? ''
  const combined = `${detail} ${notes}`.trim()

  if (!difficulty && detail) {
    const beforeSep = detail.split('·')[0]?.trim() ?? ''
    if (beforeSep) difficulty = beforeSep
  }

  if (distanceMi == null && combined) {
    const m = combined.match(/(\d+\.?\d*)\s*mi\b/i)
    if (m) distanceMi = parseFloat(m[1])
  }

  if (durationMin == null && combined) {
    const dm = combined.match(/(\d+)\s*(?:min|minutes|mins)\b/i)
    if (dm) durationMin = parseInt(dm[1], 10)
  }

  return { difficulty, distanceMi, durationMin }
}

function whoWithLabel(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return 'travelers'
  const u = raw.toUpperCase()
  const map: Record<string, string> = {
    SOLO: 'solo',
    SPOUSE: 'a couple',
    FRIENDS: 'friends',
    FAMILY: 'family (include kid-friendly ideas where relevant)',
    OTHER: 'a group',
  }
  return map[u] ?? raw.trim()
}

function buildDiscoverPrompt(input: {
  city: string
  state: string
  type: DiscoverType
  daysTotal?: number | null
  whoWith?: string | null
  season?: string | null
}): { system: string; user: string } {
  const { city, state, type, daysTotal, whoWith, season } = input
  const place = state.trim() ? `${city}, ${state}` : city
  const days = typeof daysTotal === 'number' && daysTotal > 0 ? daysTotal : null
  const group = whoWithLabel(whoWith)
  const seasonLine = season?.trim() ? season.trim() : 'the trip dates'

  const system = `You are Angela, a highly intuitive AI travel planner. Return ONLY valid JSON (no markdown):
{
  "suggestions": [
    {
      "name": "string — place or activity name",
      "subtitle": "string — category, area, or how to get there",
      "detail": "string — one concise line of practical info",
      "notes": "string — why it fits this trip",
      "difficulty": "optional for hikes: Easy | Moderate | Hard",
      "distanceMi": optional number for hikes,
      "durationMin": optional number for hikes,
      "url": "optional real URL if you know it"
    }
  ]
}
Use real places and realistic details. Do not invent fake URLs — omit "url" if unsure.`

  if (type === 'day_trip') {
    const user = `TRIP CONTEXT:
${days ? `${days}-day trip` : 'Multi-day trip'} based in ${place} during ${seasonLine}.
Traveling with: ${group}.

TASK: Suggest 5–7 day-trip DESTINATIONS (whole towns, islands, or regions) people can reach from ${city} in under ~2 hours one way. For each:
- name = the destination (e.g. "Provincetown, MA")
- subtitle = how to get there and rough travel time (e.g. "Ferry · 90 min" or "Drive · 45 min")
- detail = 2–3 highlights once there
- notes = why it fits ${group} on this trip

Include a mix of well-known and worthwhile nearby spots. Think water, outdoors, food, and culture when appropriate for the region.`

    return { system, user }
  }

  const typeGuide: Record<Exclude<DiscoverType, 'day_trip'>, string> = {
    concert: 'live music, concerts, and notable venues hosting shows',
    hike: 'hikes, trails, and outdoor walks (include difficulty and distance in subtitle/detail when possible)',
    dining: 'restaurants, food halls, and memorable dining — real establishments',
    attraction: 'museums, landmarks, parks, tours, and things to see and do in or very near the city',
  }

  const user = `TRIP CONTEXT:
${days ? `${days}-day trip` : 'Trip'} to ${place} during ${seasonLine}.
Traveling with: ${group}.

TASK: Suggest 6–8 ${typeGuide[type as Exclude<DiscoverType, 'day_trip'>]}.

Think about:
- Spots IN and immediately around ${city}
- Day-trip-adjacent picks when they are still ${type === 'hike' ? 'trail-focused' : 'the right category'} (note distance in subtitle)
- ${group === 'family (include kid-friendly ideas where relevant)' ? 'Kid-friendly and practical options.' : ''}
- Water activities, outdoor experiences, and local specialties when relevant to the region

Return rich, specific suggestions — not generic placeholders.`

  return { system, user }
}

async function suggestionsFromOpenAI(params: {
  city: string
  state: string
  type: DiscoverType
  daysTotal?: number | null
  whoWith?: string | null
  season?: string | null
}): Promise<Suggestion[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const { system, user } = buildDiscoverPrompt(params)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    console.error('discover OpenAI error:', res.status, await res.text())
    return null
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) return null

  try {
    const parsed = JSON.parse(content) as { suggestions?: unknown }
    if (!Array.isArray(parsed.suggestions)) return null
    return parsed.suggestions
      .map((raw) => {
        if (!raw || typeof raw !== 'object') return null
        const o = raw as Record<string, unknown>
        const name = typeof o.name === 'string' ? o.name.trim() : ''
        if (!name) return null
        const s: Suggestion = { name }
        if (typeof o.subtitle === 'string') s.subtitle = o.subtitle
        if (typeof o.detail === 'string') s.detail = o.detail
        if (typeof o.notes === 'string') s.notes = o.notes
        if (typeof o.url === 'string') s.url = o.url
        if (typeof o.difficulty === 'string') s.difficulty = o.difficulty
        if (typeof o.distanceMi === 'number') s.distanceMi = o.distanceMi
        if (typeof o.durationMin === 'number') s.durationMin = o.durationMin
        return s
      })
      .filter((x): x is Suggestion => x != null)
  } catch {
    return null
  }
}

function getStubSuggestions(city: string, type: DiscoverType): Suggestion[] {
  if (type === 'day_trip') {
    return [
      {
        name: `Day trip from ${city} (stub)`,
        subtitle: 'Enable OPENAI_API_KEY for real nearby day trips',
        detail: 'This is fallback data when AI is unavailable.',
        notes: 'Configure API key for Angela-quality suggestions.',
      },
    ]
  }
  return [
    {
      name: `${city} preview (stub)`,
      subtitle: 'Enable OPENAI_API_KEY',
      detail: 'Connect OpenAI for real suggestions.',
      notes: 'Stub fallback.',
    },
  ]
}

/**
 * POST /api/discover
 * Body: { city, state?, type, daysTotal?, whoWith?, season? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      city: cityRaw = '',
      state: stateRaw = '',
      type,
      daysTotal: daysRaw,
      whoWith,
      season,
    } = body as {
      city?: string
      state?: string
      type?: DiscoverType
      daysTotal?: number | null
      whoWith?: string | null
      season?: string | null
    }

    const city = typeof cityRaw === 'string' ? cityRaw.trim() : ''
    const state = typeof stateRaw === 'string' ? stateRaw.trim() : ''

    if (!city) {
      return NextResponse.json({ error: 'city is required' }, { status: 400 })
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const daysTotal =
      typeof daysRaw === 'number' && Number.isFinite(daysRaw) ? daysRaw : null

    let suggestions =
      (await suggestionsFromOpenAI({
        city,
        state,
        type,
        daysTotal,
        whoWith,
        season,
      })) ?? []

    if (suggestions.length === 0) {
      suggestions = getStubSuggestions(city, type)
    }

    return NextResponse.json({ city, state, type, suggestions })
  } catch (error) {
    console.error('Discover POST error:', error)
    return NextResponse.json({ error: 'Failed to get suggestions' }, { status: 500 })
  }
}

/**
 * PUT /api/discover — Save a suggestion to the global city catalogue.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      city: cityName,
      state,
      country = 'USA',
      type,
      suggestion,
    } = body as {
      city: string
      state?: string
      country?: string
      type: DiscoverType
      suggestion: Suggestion
    }

    if (!cityName?.trim() || !type || !suggestion?.name) {
      return NextResponse.json(
        { error: 'city, type, and suggestion.name are required' },
        { status: 400 }
      )
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const city = await upsertCityByName({
      name: cityName,
      state: state?.trim() ?? null,
      country: country.trim(),
    })

    let saved: unknown

    if (type === 'concert') {
      saved = await prisma.concert.create({
        data: {
          name: suggestion.name,
          artist: suggestion.subtitle ?? null,
          venue: suggestion.detail ?? null,
          url: suggestion.url ?? null,
          description: suggestion.notes ?? null,
          cityId: city.id,
        },
      })
    } else if (type === 'hike') {
      const { difficulty, distanceMi, durationMin } = resolveHikeMetrics(suggestion)
      saved = await prisma.hike.create({
        data: {
          name: suggestion.name,
          trailOrPlace: suggestion.subtitle ?? null,
          difficulty,
          distanceMi,
          durationMin,
          notes: suggestion.notes ?? null,
          url: suggestion.url ?? null,
          cityId: city.id,
        },
      })
    } else if (type === 'dining') {
      saved = await prisma.dining.create({
        data: {
          title: suggestion.name,
          category: suggestion.subtitle ?? null,
          address: suggestion.detail ?? null,
          website: suggestion.url ?? null,
          cityId: city.id,
        },
      })
    } else if (type === 'attraction') {
      saved = await prisma.attraction.create({
        data: {
          title: suggestion.name,
          category: suggestion.subtitle ?? null,
          address: suggestion.detail ?? null,
          website: suggestion.url ?? null,
          cityId: city.id,
        },
      })
    } else if (type === 'day_trip') {
      const addressParts = [suggestion.subtitle, suggestion.detail, suggestion.notes].filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0
      )
      saved = await prisma.attraction.create({
        data: {
          title: suggestion.name,
          category: 'Day trip',
          address: addressParts.join(' · ').slice(0, 2000) || null,
          website: suggestion.url ?? null,
          cityId: city.id,
        },
      })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ city, type, saved }, { status: 201 })
  } catch (error) {
    console.error('Discover PUT error:', error)
    return NextResponse.json({ error: 'Failed to save to catalogue' }, { status: 500 })
  }
}
