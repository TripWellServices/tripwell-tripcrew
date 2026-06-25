export type ThingsToDoBucket = 'mustDos' | 'dining' | 'experiences'

export type ThingsToDoCandidate = {
  title: string
  subtitle?: string
  detail?: string
  reason?: string
  url?: string
  bucket: ThingsToDoBucket
  /** Short type label — museum, neighborhood, viewpoint, etc. */
  type?: string
  whyMustDo?: string
  bestCombinedWith?: string
  /** Google text search query for place matching */
  placeQuery?: string
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

const SYSTEM_PROMPT = `You are Angela, a trip planner for concert and festival trips. Return ONLY valid JSON:
{
  "mustDos": [{
    "title": "string",
    "subtitle": "string",
    "detail": "string",
    "reason": "string",
    "type": "string",
    "whyMustDo": "string",
    "bestCombinedWith": "string",
    "placeQuery": "string",
    "url": "optional string"
  }],
  "dining": [{ "title": "string", "subtitle": "string", "detail": "string", "reason": "string", "url": "optional string" }],
  "experiences": [{ "title": "string", "subtitle": "string", "detail": "string", "reason": "string", "url": "optional string" }]
}

You are planning for the trip's primary city (DESTINATION in the user prompt).
mustDos = exactly 5 blended picks: iconic sights, neighborhoods, views, and TikTok-worthy spots — not only museums.
For each mustDo include:
- type: short category (museum, neighborhood, viewpoint, park, market, etc.)
- whyMustDo: one sentence on why it belongs on this trip
- bestCombinedWith: nearby food, concert-day timing, or another stop to pair with
- placeQuery: "Place Name City" for Google lookup (real place names only)
dining = restaurants, cafes, bars, late-night food (3-5 items when requested).
experiences = bookable activities like wine tasting, boat tours (3-5 when requested).
Do not invent fake URLs — omit url if unsure.`

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
    detail: typeof o.detail === 'string' ? o.detail.trim() || undefined : typeof o.description === 'string' ? o.description.trim() || undefined : undefined,
    reason: typeof o.reason === 'string' ? o.reason.trim() || undefined : typeof o.notes === 'string' ? o.notes.trim() || undefined : undefined,
    url: typeof o.url === 'string' ? o.url.trim() || undefined : undefined,
    type:
      typeof o.type === 'string'
        ? o.type.trim() || undefined
        : typeof o.category === 'string'
          ? o.category.trim() || undefined
          : undefined,
    whyMustDo:
      typeof o.whyMustDo === 'string'
        ? o.whyMustDo.trim() || undefined
        : typeof o.why_must_do === 'string'
          ? o.why_must_do.trim() || undefined
          : undefined,
    bestCombinedWith:
      typeof o.bestCombinedWith === 'string'
        ? o.bestCombinedWith.trim() || undefined
        : typeof o.best_combined_with === 'string'
          ? o.best_combined_with.trim() || undefined
          : undefined,
    placeQuery:
      typeof o.placeQuery === 'string'
        ? o.placeQuery.trim() || undefined
        : typeof o.place_query === 'string'
          ? o.place_query.trim() || undefined
          : undefined,
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
  const mustDos = normBucket(o.mustDos, 'mustDos').slice(0, 5)
  return {
    mustDos,
    dining: normBucket(o.dining, 'dining'),
    experiences: normBucket(o.experiences, 'experiences'),
  }
}

function buildUserPrompt(ctx: TripPoiSuggestionContext): string {
  const place = [ctx.city, ctx.state, ctx.country].filter(Boolean).join(', ')
  const filters = ctx.filters ?? {}
  const toggles: string[] = []
  if (filters.mustDos !== false) toggles.push('must dos / sights (top 5 blend)')
  if (filters.dining !== false) toggles.push('dining')
  if (filters.experiences !== false) toggles.push('experiences / bookable activities')
  if (filters.outdoors) toggles.push('outdoors')
  if (filters.kidFriendly) toggles.push('kid-friendly')
  if (filters.nightlife) toggles.push('nightlife')

  const lines: string[] = [
    `TRIP: ${ctx.tripTitle?.trim() || 'Untitled trip'}`,
    place ? `TRIP CITY: ${place}` : 'TRIP CITY: unknown — infer from context if needed',
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
    'As a trip planner for this city, suggest must-dos as a top 5 blend of iconic sights, neighborhoods, food-adjacent stops, and easy add-ons around the concert trip vibe. Focus on what fits arrival day, free time before the show, and post-concert exploring.',
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
        type: 'neighborhood',
        detail: 'Enable OPENAI_API_KEY for real suggestions',
        whyMustDo: 'Get oriented and find the vibe of the city center.',
        bestCombinedWith: 'A coffee stop or casual lunch nearby',
        reason: 'Stub fallback when AI is unavailable',
        bucket: 'mustDos',
        placeQuery: `downtown ${city}`,
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
