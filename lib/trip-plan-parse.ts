import {
  normalizeParsedTripPlan,
  type ParsedTripPlan,
} from '@/lib/trip-plan-model'

const TRIP_PLAN_SYSTEM = `You extract structured trip planning data from free text (confirmation emails, Notes, bullet lists, chat paste).

Return ONLY one JSON object (no markdown). Use null for unknown values. Do not invent confirmation codes or flight numbers not in the text.

Fields:
- tripName: string|null — short trip label
- startDate, endDate: string|null — ISO date YYYY-MM-DD if known
- city, state, country: string|null — primary destination (if multi-city, use main stay)
- whereFreeform: string|null — if place is vague ("Amalfi coast"), put it here
- whoWith: one of SOLO|SPOUSE|FRIENDS|FAMILY|OTHER|null
- transportMode: one of CAR|BOAT|PLANE|null — primary way traveler reaches the destination
- lodging: object|null — { title, address, chain, lodgingType (one of HOTEL|RESORT|EXTENDED_STAY|VACATION_RENTAL|HOSTEL|BED_AND_BREAKFAST|OTHER|null), defaultCheckInTime, defaultCheckOutTime, notes }
- legs: array — each leg: { kind: flight|train|drive|other, summary, depart, arrive, origin, destination, carrier, flightNumber, recordLocator } (use nulls for missing keys)
- notes: string|null — other useful planning notes from the text
- experiences: array (optional) — when the text describes places to visit, museums, activities, or structured “experience” specs (bullets for duration, cost, address, jump-off nearby). Omit or use [] if the text is only travel confirmations with no POI/activity blocks. Each item:
  { name, entity_ref, description, duration_minutes (number), experience_type (string),
    cost: { adult_usd, child_usd, family_estimate_usd },
    location: { name, address, lat, lng },
    logistics: { arrival_buffer_minutes, booking_required, indoor_outdoor, walking_required },
    jump_off_next_to: [ { name, type, distance_minutes_walk, distance_minutes_drive, description } ],
    tripwell_fit: { effort_level, kid_friendly, parent_friendly, time_block } }
  Use null for unknown nested keys. Integers or floats for money/durations when stated.
- daySlots: array (optional) — when the text is a timed day itinerary (time blocks + named locations, markdown tours, or bullet schedules). Omit or use [] for pure confirmations or unstructured notes. Each item in chronological order:
  { type: "dining"|"attraction"|"logistic", title, startTime, endTime, address, notes,
    foodType, costLevel (integer 1–5 only, 1=cheap 5=fine), idealTime ("breakfast"|"lunch"|"dinner"|"snack"|"coffee_stop"),
    reservationRequired (boolean), description (longer prose), category (short label e.g. museum, shopping_district),
    subItems: string[] (store names, nearby stops, must-see list). }
  Use null for unknown keys. Drives, parking, "head home", and multi-hour transit blocks are "logistic". Meals, cafes, bakeries, dinner reservations are "dining". Sightseeing, museums, shopping streets, parks, campuses are "attraction".

If the text mentions multiple flights or trains, add one object per leg to legs in chronological order.`

export async function parseTripPlanBlobWithOpenAI(
  blob: string
): Promise<ParsedTripPlan> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const trimmed = blob.trim()
  if (trimmed.length < 20) {
    throw new Error('Paste at least 20 characters of itinerary text')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: TRIP_PLAN_SYSTEM },
        { role: 'user', content: `Parse this trip text:\n\n${trimmed}` },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('OpenAI trip plan parse error:', res.status, err)
    throw new Error('AI parsing failed')
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Empty AI response')

  let raw: unknown
  try {
    raw = JSON.parse(content)
  } catch {
    throw new Error('AI did not return valid JSON')
  }

  return normalizeParsedTripPlan(raw)
}
