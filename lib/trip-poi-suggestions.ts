export type ThingsToDoBucket = 'mustDos' | 'dining' | 'experiences'

export type ThingsToDoCandidate = {
  title: string
  subtitle?: string
  detail?: string
  reason?: string
  url?: string
  bucket: ThingsToDoBucket
}

export type ThingsToDoSuggestionFilters = {
  interests?: string
  mustDos?: boolean
  dining?: boolean
  experiences?: boolean
  outdoors?: boolean
  kidFriendly?: boolean
  nightlife?: boolean
}

export type ThingsToDoSuggestionsResult = {
  mustDos: ThingsToDoCandidate[]
  dining: ThingsToDoCandidate[]
  experiences: ThingsToDoCandidate[]
}

export type TripPoiSuggestionContext = {
  tripTitle?: string | null
  purpose?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  season?: string | null
  startDate?: string | null
  endDate?: string | null
  whoWith?: string | null
  concertName?: string | null
  concertVenue?: string | null
  concertDescription?: string | null
  lodgingTitle?: string | null
  lodgingAddress?: string | null
  lodgingLat?: number | null
  lodgingLng?: number | null
  filters?: ThingsToDoSuggestionFilters
}

const SYSTEM_PROMPT = `You are Angela, a travel planner for concert and festival trips. Return ONLY valid JSON:
{
  "mustDos": [{ "title": "string", "subtitle": "string", "detail": "string", "reason": "string", "url": "optional string" }],
  "dining": [{ "title": "string", "subtitle": "string", "detail": "string", "reason": "string", "url": "optional string" }],
  "experiences": [{ "title": "string", "subtitle": "string", "detail": "string", "reason": "string", "url": "optional string" }]
}
Use real places when possible. Do not invent fake URLs — omit url if unsure.
mustDos = sights, neighborhoods, views, TikTok-worthy spots.
dining = restaurants, cafes, bars, late-night food.
experiences = bookable activities like wine tasting, boat tours, guided adventures.`

function whoWithLabel(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return 'travelers'
  const map: Record<string, string> = {
    SOLO: 'solo',
    SPOUSE: 'a couple',
    FRIENDS: 'friends',
    FAMILY: 'family (include kid-friendly ideas where relevant)',
    OTHER: 'a group',
  }
  return map[raw.toUpperCase()] ?? raw.trim()
}

function normCandidate(raw: unknown, bucket: ThingsToDoBucket): ThingsToDoCandidate | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const title = typeof o.title === 'string' ? o.title.trim() : typeof o.name === 'string' ? o.name.trim() : ''
  if (!title) return null
  return {
    title,
    bucket,
    subtitle: typeof o.subtitle === 'string' ? o.subtitle.trim() || undefined : undefined,
    detail: typeof o.detail === 'string' ? o.detail.trim() || undefined : undefined,
    reason: typeof o.reason === 'string' ? o.reason.trim() || undefined : typeof o.notes === 'string' ? o.notes.trim() || undefined : undefined,
    url: typeof o.url === 'string' ? o.url.trim() || undefined : undefined,
  }
}

function normBucket(raw: unknown, bucket: ThingsToDoBucket): ThingsToDoCandidate[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => normCandidate(item, bucket))
    .filter((x): x is ThingsToDoCandidate => x != null)
}

export function normalizeThingsToDoSuggestions(raw: unknown): ThingsToDoSuggestionsResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    mustDos: normBucket(o.mustDos, 'mustDos'),
    dining: normBucket(o.dining, 'dining'),
    experiences: normBucket(o.experiences, 'experiences'),
  }
}

function buildUserPrompt(ctx: TripPoiSuggestionContext): string {
  const place = [ctx.city, ctx.state, ctx.country].filter(Boolean).join(', ')
  const filters = ctx.filters ?? {}
  const toggles: string[] = []
  if (filters.mustDos !== false) toggles.push('must dos / sights')
  if (filters.dining !== false) toggles.push('dining')
  if (filters.experiences !== false) toggles.push('experiences / bookable activities')
  if (filters.outdoors) toggles.push('outdoors')
  if (filters.kidFriendly) toggles.push('kid-friendly')
  if (filters.nightlife) toggles.push('nightlife')

  const lines: string[] = [
    `TRIP: ${ctx.tripTitle?.trim() || 'Untitled trip'}`,
    place ? `DESTINATION: ${place}` : '',
    ctx.season ? `SEASON: ${ctx.season}` : '',
    ctx.startDate && ctx.endDate ? `DATES: ${ctx.startDate} to ${ctx.endDate}` : '',
    `TRAVELERS: ${whoWithLabel(ctx.whoWith)}`,
    ctx.purpose?.trim() ? `PURPOSE: ${ctx.purpose.trim()}` : '',
    ctx.concertName?.trim()
      ? `CONCERT ANCHOR: ${ctx.concertName.trim()}${ctx.concertVenue ? ` at ${ctx.concertVenue}` : ''}`
      : '',
    ctx.concertDescription?.trim() ? `CONCERT NOTES: ${ctx.concertDescription.trim().slice(0, 500)}` : '',
    ctx.lodgingTitle?.trim()
      ? `STAY: ${ctx.lodgingTitle.trim()}${ctx.lodgingAddress ? ` — ${ctx.lodgingAddress}` : ''}`
      : '',
    ctx.lodgingLat != null && ctx.lodgingLng != null
      ? `STAY COORDS: ${ctx.lodgingLat}, ${ctx.lodgingLng}`
      : '',
    filters.interests?.trim() ? `VIBE / INTERESTS: ${filters.interests.trim()}` : '',
    toggles.length ? `INCLUDE BUCKETS: ${toggles.join(', ')}` : '',
    '',
    'Suggest 5-7 items per requested bucket. Focus on what to do around the concert/festival arrival vibe — neighborhoods, food, and optional bookable experiences near the stay.',
  ]

  return lines.filter(Boolean).join('\n')
}

export async function fetchThingsToDoSuggestions(
  ctx: TripPoiSuggestionContext
): Promise<ThingsToDoSuggestionsResult | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(ctx) },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    console.error('poi-suggestions OpenAI error:', res.status, await res.text())
    return null
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) return null

  try {
    return normalizeThingsToDoSuggestions(JSON.parse(content))
  } catch {
    return null
  }
}

export function stubThingsToDoSuggestions(city: string): ThingsToDoSuggestionsResult {
  return {
    mustDos: [
      {
        title: `Explore downtown ${city}`,
        subtitle: 'Neighborhood walk',
        detail: 'Enable OPENAI_API_KEY for real suggestions',
        reason: 'Stub fallback when AI is unavailable',
        bucket: 'mustDos',
      },
    ],
    dining: [
      {
        title: `Local favorite near ${city}`,
        subtitle: 'Restaurant',
        detail: 'Stub data',
        reason: 'Configure OpenAI for Angela-quality picks',
        bucket: 'dining',
      },
    ],
    experiences: [
      {
        title: `Guided experience in ${city}`,
        subtitle: 'Optional activity',
        detail: 'Stub data',
        reason: 'Bookable activities appear here',
        bucket: 'experiences',
      },
    ],
  }
}
