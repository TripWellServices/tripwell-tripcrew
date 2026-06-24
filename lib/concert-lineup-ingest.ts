import type { ConcertInfoIngest } from '@/app/components/planner/concert-ingest-types'

const CONCERT_INGEST_SYSTEM = `You extract structured festival/concert info from pasted website copy, ticket emails, or FAQ text.

Return ONLY one JSON object (no markdown). Use null for unknown values. Do not invent artists or policies not in the text.

Fields:
- concertName: string|null — festival or event name
- artist: string|null — main headliner or primary artist if stated once at event level
- venue: string|null
- city, state, country: string|null
- concertUrl: string|null
- eventStartDate, eventEndDate: string|null — ISO YYYY-MM-DD
- eventStartTime, eventEndTime: string|null — 24h HH:MM when known
- isFestival: boolean — true for multi-day festivals
- lineup: array — headliners / closing acts per festival day when present. Each item:
  { day: number (1-based day of festival), startTime: "HH:MM"|null, endTime: "HH:MM"|null, headliner: string }
  Only include rows when an artist/act and day or time is reasonably clear. Use [] if not present.
- bagPolicy: string|null — bag / security / prohibited items policy summary
- gettingThere: string|null — transit, parking, shuttle, directions summary
- tips: string[] — short practical attendee tips (arrive early, cashless, etc.)

For festivals like Osheaga: set isFestival true, span eventStartDate/eventEndDate across festival days, and put nightly headliners in lineup with day numbers.`

function normTime(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t || null
}

function normDate(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null
}

function normLineup(raw: unknown): ConcertInfoIngest['lineup'] {
  if (!Array.isArray(raw)) return []
  const out: ConcertInfoIngest['lineup'] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const headliner = typeof row.headliner === 'string' ? row.headliner.trim() : ''
    if (!headliner) continue
    const dayRaw = row.day
    const day =
      typeof dayRaw === 'number' && Number.isFinite(dayRaw) && dayRaw >= 1
        ? Math.floor(dayRaw)
        : typeof dayRaw === 'string' && /^\d+$/.test(dayRaw.trim())
          ? parseInt(dayRaw.trim(), 10)
          : ('' as const)
    out.push({
      day,
      startTime: normTime(row.startTime) ?? '',
      endTime: normTime(row.endTime) ?? '',
      headliner,
    })
  }
  return out
}

function normTips(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function normalizeConcertInfoIngest(raw: unknown): ConcertInfoIngest {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    concertName: typeof o.concertName === 'string' ? o.concertName.trim() : null,
    artist: typeof o.artist === 'string' ? o.artist.trim() || null : null,
    venue: typeof o.venue === 'string' ? o.venue.trim() || null : null,
    city: typeof o.city === 'string' ? o.city.trim() || null : null,
    state: typeof o.state === 'string' ? o.state.trim() || null : null,
    country: typeof o.country === 'string' ? o.country.trim() || null : null,
    concertUrl: typeof o.concertUrl === 'string' ? o.concertUrl.trim() || null : null,
    eventStartDate: normDate(o.eventStartDate),
    eventEndDate: normDate(o.eventEndDate),
    eventStartTime: normTime(o.eventStartTime),
    eventEndTime: normTime(o.eventEndTime),
    isFestival: Boolean(o.isFestival),
    lineup: normLineup(o.lineup),
    bagPolicy: typeof o.bagPolicy === 'string' ? o.bagPolicy.trim() || null : null,
    gettingThere: typeof o.gettingThere === 'string' ? o.gettingThere.trim() || null : null,
    tips: normTips(o.tips),
  }
}

export async function parseConcertLineupBlobWithOpenAI(blob: string): Promise<ConcertInfoIngest> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const trimmed = blob.trim()
  if (trimmed.length < 20) {
    throw new Error('Paste at least 20 characters of festival or concert text')
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
        { role: 'system', content: CONCERT_INGEST_SYSTEM },
        { role: 'user', content: `Parse this festival/concert text:\n\n${trimmed}` },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('OpenAI concert ingest error:', res.status, err)
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

  return normalizeConcertInfoIngest(raw)
}
