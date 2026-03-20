import {
  normalizeHikeParseResponse,
  type HikeParseResult,
} from '@/lib/hike-model'

const HIKE_PARSE_SYSTEM = `You extract structured hike data from text (e.g. AllTrails copy-paste, trail websites, or a short user note).

Return ONLY one JSON object (no markdown). Use null for unknown values. Be conservative: do not invent GPS coordinates; only include trailheadLat/trailheadLng if the text gives numbers or obvious coordinates.

Fields:
- name: string (trail name, required — infer from context if needed)
- trailOrPlace: string|null (park, forest, or geographic feature name)
- difficulty: string|null (e.g. easy, moderate, hard)
- distanceMi: number|null (total route distance in miles)
- durationMin: number|null (estimated hiking time in minutes)
- routeType: one of "out_and_back" | "loop" | "point_to_point" | "lollipop" | null
- trailheadLat: number|null (WGS84 decimal)
- trailheadLng: number|null (WGS84 decimal)
- nearestTown: string|null (closest town or city for trip planning)
- nearestState: string|null (state/province abbreviation or name if known)
- country: string|null (default USA when clearly US)
- url: string|null (source link if present in text)
- notes: string|null (one short sentence summarizing the hike for humans)

Aliases: "circular" or "loop trail" => routeType "loop". "Out and back" / "out-and-back" => "out_and_back".`

export async function parseHikeDescriptionWithOpenAI(
  regionHint: string | undefined,
  pastedDescription: string
): Promise<HikeParseResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const hint = regionHint?.trim()
  const userBlock = [
    hint && `User said they are thinking of hiking near: ${hint}`,
    'Pasted / description:',
    pastedDescription.trim(),
  ]
    .filter(Boolean)
    .join('\n\n')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: HIKE_PARSE_SYSTEM },
        { role: 'user', content: userBlock },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('OpenAI hike parse error:', res.status, err)
    throw new Error('AI parsing failed')
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Empty AI response')

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('AI did not return valid JSON')
  }

  const result = normalizeHikeParseResponse(parsed)
  if (!result.name?.trim()) {
    throw new Error('AI did not return a trail name')
  }
  return result
}
