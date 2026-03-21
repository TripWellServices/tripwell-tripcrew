import { NextRequest, NextResponse } from 'next/server'
import { normalizeHikeParseResponse } from '@/lib/hike-model'

export const dynamic = 'force-dynamic'

const SYSTEM = `You are a hiking guide. The user wants trail ideas (not web lookup — use your knowledge of well-known trails and realistic options).

Given: place (city/region), optional US state, preferred difficulty, and what they want to see (e.g. waterfalls, views, lakes, forest).

Return ONLY valid JSON:
{ "suggestions": [
  {
    "name": "trail name",
    "trailOrPlace": "park or wilderness name",
    "difficulty": "easy|moderate|hard",
    "distanceMi": number or null,
    "durationMin": estimated minutes or null,
    "routeType": "out_and_back"|"loop"|"point_to_point"|"lollipop"|null,
    "nearestTown": "closest town for trip planning",
    "nearestState": "2-letter or full state if US",
    "notes": "one sentence why it fits their request"
  }
] }

Rules:
- Return exactly 3 or 4 suggestions (prefer 4 when possible).
- Trails should plausibly exist in or near the given place. If place is vague, still suggest realistic options for that region.
- Vary trail styles (not four copies of the same hike).
- Do not invent GPS coordinates (omit trailheadLat/trailheadLng or use null).
- country defaults to USA when the place is in the United States.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      place,
      state,
      difficulty,
      interests,
    } = body as {
      place?: string
      state?: string
      difficulty?: string
      interests?: string
    }

    const placeTrim = typeof place === 'string' ? place.trim() : ''
    if (placeTrim.length < 2) {
      return NextResponse.json(
        { error: 'place is required (e.g. city or region).' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured' },
        { status: 503 }
      )
    }

    const userBlock = [
      `Place: ${placeTrim}`,
      state?.trim() && `State/region hint: ${state.trim()}`,
      difficulty?.trim() && `Preferred difficulty: ${difficulty.trim()}`,
      interests?.trim() && `What they want to see / do: ${interests.trim()}`,
    ]
      .filter(Boolean)
      .join('\n')

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
          { role: 'user', content: userBlock },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('OpenAI hike recommend error:', res.status, err)
      return NextResponse.json({ error: 'AI recommendations failed' }, { status: 502 })
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'Invalid AI JSON' }, { status: 502 })
    }

    const root =
      parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    const rawList = Array.isArray(root.suggestions) ? root.suggestions : []
    const suggestions = rawList
      .map((item) => normalizeHikeParseResponse(item))
      .filter((s) => s.name && s.name !== 'Unnamed trail')

    if (suggestions.length === 0) {
      return NextResponse.json({ error: 'No suggestions returned' }, { status: 502 })
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 4) })
  } catch (error) {
    console.error('Hike recommend error:', error)
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 })
  }
}
