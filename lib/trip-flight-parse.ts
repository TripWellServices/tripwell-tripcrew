import type { TripFlightDirection } from '@prisma/client'
import {
  COMMON_AIRLINES,
  emptyFlightRow,
  normalizeAirportCode,
  type TripFlightFormRow,
} from '@/lib/trip-flight'
import type { ParsedTripLeg } from '@/lib/trip-plan-types'

const FLIGHT_PARSE_SYSTEM = `You extract structured flight confirmation data from pasted email text, Expedia/ airline confirmations, or screenshots.

Return ONLY valid JSON:
{
  "flights": [
    {
      "direction": "OUTBOUND" | "RETURN" | "OTHER" | null,
      "airlineName": string | null,
      "airlineCode": string | null,
      "flightNumber": string | null,
      "departureAirportCode": string | null,
      "arrivalAirportCode": string | null,
      "departureTime": string | null,
      "arrivalTime": string | null,
      "confirmationCode": string | null,
      "notes": string | null
    }
  ],
  "startingLocation": string | null
}

Rules:
- Extract every distinct flight leg in chronological order.
- Use 3-letter IATA airport codes when visible (BOS, YUL, JFK).
- Split combined flight numbers: AA1234 -> airlineCode AA, flightNumber 1234.
- departureTime/arrivalTime as ISO 8601 or YYYY-MM-DDTHH:mm when possible.
- Do not invent confirmation codes or flight numbers not present in the source.
- For one-way trips with a single leg, return exactly ONE flight row — do not duplicate legs.
- For round trips: first leg OUTBOUND, return leg RETURN when obvious; otherwise null direction.
- confirmationCode is the booking/record locator (PNR), shared across legs if one code applies to all.
- Put extra metadata in notes when not mapped to fields: Expedia/itinerary numbers, operated-by carrier, cabin/fare class, duration (e.g. "1h 42m"), booking provider.`

export type FlightParseResult = {
  flights: TripFlightFormRow[]
  startingLocation: string | null
}

function optionalStr(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t || null
}

function normDirection(v: unknown, index: number, total: number): TripFlightDirection {
  if (typeof v === 'string') {
    const u = v.toUpperCase()
    if (u === 'OUTBOUND' || u === 'RETURN' || u === 'OTHER') return u
  }
  if (total <= 1) return 'OUTBOUND'
  if (index === 0) return 'OUTBOUND'
  if (index === 1 && total === 2) return 'RETURN'
  return 'OTHER'
}

export function splitFlightNumber(raw: string | null | undefined): {
  airlineCode: string
  flightNumber: string
} {
  const t = (raw ?? '').trim().toUpperCase().replace(/\s+/g, '')
  if (!t) return { airlineCode: '', flightNumber: '' }

  if (/^\d+[A-Z]?$/.test(t)) {
    return { airlineCode: '', flightNumber: t }
  }

  const match = t.match(/^([A-Z0-9]{2})(\d{1,4}[A-Z]?)$/)
  if (match) {
    return { airlineCode: match[1], flightNumber: match[2] }
  }

  if (/^\d+$/.test(t)) {
    return { airlineCode: '', flightNumber: t }
  }

  return { airlineCode: '', flightNumber: t }
}

export function matchAirline(
  name: string | null | undefined,
  code: string | null | undefined
): { airlineName: string; airlineCode: string } {
  const codeT = (code ?? '').trim().toUpperCase()
  const nameT = (name ?? '').trim()

  if (codeT) {
    const byCode = COMMON_AIRLINES.find((a) => a.code === codeT)
    if (byCode) return { airlineName: byCode.name, airlineCode: byCode.code }
  }

  if (nameT) {
    const byName = COMMON_AIRLINES.find(
      (a) => a.name.toLowerCase() === nameT.toLowerCase()
    )
    if (byName) return { airlineName: byName.name, airlineCode: byName.code }
    const partial = COMMON_AIRLINES.find((a) =>
      nameT.toLowerCase().includes(a.name.toLowerCase().split(' ')[0] ?? '')
    )
    if (partial) return { airlineName: partial.name, airlineCode: partial.code }
    return { airlineName: nameT, airlineCode: codeT }
  }

  return { airlineName: '', airlineCode: codeT }
}

export function isoToDatetimeLocal(value: string | null | undefined): string {
  const t = optionalStr(value)
  if (!t) return ''
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) return t.slice(0, 16)
  const dt = new Date(t)
  if (Number.isNaN(dt.getTime())) return ''
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  const h = String(dt.getHours()).padStart(2, '0')
  const min = String(dt.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export function normalizeAiFlightRow(
  raw: unknown,
  index: number,
  total: number
): TripFlightFormRow | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  const hasAny =
    optionalStr(o.airlineName) ||
    optionalStr(o.airlineCode) ||
    optionalStr(o.flightNumber) ||
    optionalStr(o.departureAirportCode) ||
    optionalStr(o.arrivalAirportCode) ||
    optionalStr(o.departureTime) ||
    optionalStr(o.arrivalTime) ||
    optionalStr(o.confirmationCode)

  if (!hasAny) return null

  const rawFlightNum = optionalStr(o.flightNumber)
  const split = splitFlightNumber(rawFlightNum)
  const airlineCodeRaw = optionalStr(o.airlineCode) ?? split.airlineCode
  const matched = matchAirline(optionalStr(o.airlineName), airlineCodeRaw)

  return {
    direction: normDirection(o.direction, index, total),
    airlineName: matched.airlineName,
    airlineCode: matched.airlineCode || normalizeAirportCode(airlineCodeRaw),
    flightNumber: split.flightNumber || rawFlightNum || '',
    departureAirportCode: normalizeAirportCode(optionalStr(o.departureAirportCode) ?? ''),
    arrivalAirportCode: normalizeAirportCode(optionalStr(o.arrivalAirportCode) ?? ''),
    departureTime: isoToDatetimeLocal(optionalStr(o.departureTime)),
    arrivalTime: isoToDatetimeLocal(optionalStr(o.arrivalTime)),
    confirmationCode: optionalStr(o.confirmationCode ?? o.recordLocator ?? o.pnr) ?? '',
    notes: optionalStr(o.notes) ?? '',
  }
}

export function normalizeAiFlightParse(raw: unknown): FlightParseResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const flightsRaw = Array.isArray(o.flights) ? o.flights : []
  const total = flightsRaw.length
  const flights = flightsRaw
    .map((row, index) => normalizeAiFlightRow(row, index, total))
    .filter((x): x is TripFlightFormRow => x != null)

  return {
    flights: ensureOutboundReturnShape(flights),
    startingLocation: optionalStr(o.startingLocation),
  }
}

/** Ensure wizard has outbound + return slots; avoid duplicating a single parsed leg. */
export function ensureOutboundReturnShape(rows: TripFlightFormRow[]): TripFlightFormRow[] {
  if (!rows.length) {
    return [emptyFlightRow('OUTBOUND'), emptyFlightRow('RETURN')]
  }

  const filled = rows.filter(
    (r) =>
      r.airlineName.trim() ||
      r.flightNumber.trim() ||
      r.departureAirportCode.trim() ||
      r.arrivalAirportCode.trim() ||
      r.departureTime.trim() ||
      r.arrivalTime.trim() ||
      r.confirmationCode.trim()
  )

  if (filled.length === 1) {
    const only = filled[0]
    return [
      { ...only, direction: 'OUTBOUND' },
      emptyFlightRow('RETURN'),
    ]
  }

  const hasOutbound = rows.some((r) => r.direction === 'OUTBOUND')
  const hasReturn = rows.some((r) => r.direction === 'RETURN')
  const result = [...rows]

  if (!hasOutbound && filled.length > 0) {
    result.unshift({ ...filled[0], direction: 'OUTBOUND' })
  }
  if (!hasReturn && filled.length <= 1) {
    result.push(emptyFlightRow('RETURN'))
  }

  return result
}

export function parsedTripLegToFormRow(
  leg: ParsedTripLeg,
  index: number,
  total: number
): TripFlightFormRow {
  const split = splitFlightNumber(leg.flightNumber)
  const matched = matchAirline(leg.carrier, split.airlineCode)

  return {
    direction: normDirection(null, index, total),
    airlineName: matched.airlineName,
    airlineCode: matched.airlineCode,
    flightNumber: split.flightNumber || leg.flightNumber?.trim() || '',
    departureAirportCode: normalizeAirportCode(leg.origin ?? ''),
    arrivalAirportCode: normalizeAirportCode(leg.destination ?? ''),
    departureTime: isoToDatetimeLocal(leg.depart),
    arrivalTime: isoToDatetimeLocal(leg.arrive),
    confirmationCode: leg.recordLocator?.trim() ?? '',
    notes: leg.summary?.trim() ?? '',
  }
}

async function callOpenAiFlightParse(messages: unknown[]): Promise<FlightParseResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('flight parse OpenAI error:', res.status, err)
    throw new Error('AI parsing failed')
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Empty AI response')

  try {
    return normalizeAiFlightParse(JSON.parse(content))
  } catch {
    throw new Error('AI did not return valid JSON')
  }
}

export async function parseFlightConfirmationText(text: string): Promise<FlightParseResult> {
  const trimmed = text.trim()
  if (trimmed.length < 10) {
    throw new Error('Paste at least 10 characters of confirmation text')
  }

  return callOpenAiFlightParse([
    { role: 'system', content: FLIGHT_PARSE_SYSTEM },
    {
      role: 'user',
      content: `Parse flight confirmation text:\n\n${trimmed.slice(0, 20_000)}`,
    },
  ])
}

export async function parseFlightConfirmationImage(
  imageBase64: string,
  mimeType: string,
  optionalText?: string | null
): Promise<FlightParseResult> {
  if (!imageBase64.trim()) {
    throw new Error('Image data is required')
  }

  const userContent: unknown[] = [
    {
      type: 'text',
      text:
        optionalText?.trim()
          ? `Parse flights from this confirmation screenshot. Additional text:\n${optionalText.trim()}`
          : 'Parse flights from this confirmation screenshot (Expedia, airline app, email, etc.).',
    },
    {
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${imageBase64}`,
      },
    },
  ]

  return callOpenAiFlightParse([
    { role: 'system', content: FLIGHT_PARSE_SYSTEM },
    { role: 'user', content: userContent },
  ])
}
