import type { TripFlight, TripFlightDirection } from '@prisma/client'

export type TripFlightFormRow = {
  id?: string
  direction: TripFlightDirection
  airlineName: string
  airlineCode: string
  flightNumber: string
  departureAirportCode: string
  arrivalAirportCode: string
  departureTime: string
  arrivalTime: string
  durationMinutes: number | null
  confirmationCode: string
  notes: string
}

export type FlightDirectionContext = {
  preferredAirportCode?: string | null
  startingLocation?: string | null
  homeState?: string | null
}

export const COMMON_AIRLINES: { name: string; code: string }[] = [
  { name: 'American Airlines', code: 'AA' },
  { name: 'Delta Air Lines', code: 'DL' },
  { name: 'United Airlines', code: 'UA' },
  { name: 'Southwest Airlines', code: 'WN' },
  { name: 'JetBlue Airways', code: 'B6' },
  { name: 'Alaska Airlines', code: 'AS' },
  { name: 'Air Canada', code: 'AC' },
  { name: 'British Airways', code: 'BA' },
  { name: 'Lufthansa', code: 'LH' },
  { name: 'Spirit Airlines', code: 'NK' },
  { name: 'Frontier Airlines', code: 'F9' },
]

export function emptyFlightRow(
  direction: TripFlightDirection = 'OTHER'
): TripFlightFormRow {
  return {
    direction,
    airlineName: '',
    airlineCode: '',
    flightNumber: '',
    departureAirportCode: '',
    arrivalAirportCode: '',
    departureTime: '',
    arrivalTime: '',
    durationMinutes: null,
    confirmationCode: '',
    notes: '',
  }
}

function toDatetimeLocalValue(d: Date | string | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  const h = String(dt.getHours()).padStart(2, '0')
  const min = String(dt.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export function flightRowFromDb(flight: TripFlight): TripFlightFormRow {
  return {
    id: flight.id,
    direction: flight.direction,
    airlineName: flight.airlineName ?? '',
    airlineCode: flight.airlineCode ?? '',
    flightNumber: flight.flightNumber ?? '',
    departureAirportCode: flight.departureAirportCode ?? '',
    arrivalAirportCode: flight.arrivalAirportCode ?? '',
    departureTime: toDatetimeLocalValue(flight.departureTime),
    arrivalTime: toDatetimeLocalValue(flight.arrivalTime),
    durationMinutes: flight.durationMinutes ?? null,
    confirmationCode: flight.confirmationCode ?? '',
    notes: flight.notes ?? '',
  }
}

export function flightsToFormRows(flights: TripFlight[]): TripFlightFormRow[] {
  const sorted = [...flights].sort((a, b) => a.sortOrder - b.sortOrder)
  const outbound = sorted.find((f) => f.direction === 'OUTBOUND')
  const ret = sorted.find((f) => f.direction === 'RETURN')
  const others = sorted.filter(
    (f) => f.direction !== 'OUTBOUND' && f.direction !== 'RETURN'
  )

  const rows: TripFlightFormRow[] = []
  rows.push(outbound ? flightRowFromDb(outbound) : emptyFlightRow('OUTBOUND'))
  rows.push(ret ? flightRowFromDb(ret) : emptyFlightRow('RETURN'))
  for (const other of others) {
    rows.push(flightRowFromDb(other))
  }
  return rows
}

export function flightRowsFromInitial(
  flights: Pick<
    TripFlight,
    | 'id'
    | 'direction'
    | 'airlineName'
    | 'airlineCode'
    | 'flightNumber'
    | 'departureAirportCode'
    | 'arrivalAirportCode'
    | 'departureTime'
    | 'arrivalTime'
    | 'durationMinutes'
    | 'confirmationCode'
    | 'notes'
    | 'sortOrder'
  >[]
): TripFlightFormRow[] {
  if (!flights.length) {
    return [emptyFlightRow('OUTBOUND'), emptyFlightRow('RETURN')]
  }
  return flightsToFormRows(
    flights.map((f) => ({
      ...f,
      tripId: '',
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }))
  )
}

export function flightRowHasData(row: TripFlightFormRow): boolean {
  return Boolean(
    row.airlineName.trim() ||
      row.airlineCode.trim() ||
      row.flightNumber.trim() ||
      row.departureAirportCode.trim() ||
      row.arrivalAirportCode.trim() ||
      row.departureTime.trim() ||
      row.arrivalTime.trim() ||
      row.durationMinutes != null ||
      row.confirmationCode.trim() ||
      row.notes.trim()
  )
}

export function parseDatetimeLocal(value: string): Date | null {
  const t = value.trim()
  if (!t) return null
  const dt = new Date(t)
  return Number.isNaN(dt.getTime()) ? null : dt
}

export function normalizeAirportCode(value: string): string {
  return value.trim().toUpperCase().slice(0, 4)
}

export function normalizeDurationMinutes(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const rounded = Math.round(value)
    return rounded > 0 ? rounded : null
  }
  if (typeof value !== 'string') return null
  const t = value.trim().toLowerCase()
  if (!t) return null

  const hours = t.match(/(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?/)
  const mins = t.match(/(\d+)\s*m(?:in(?:ute)?s?)?/)
  if (hours || mins) {
    const h = hours ? Number(hours[1]) : 0
    const m = mins ? Number(mins[1]) : 0
    const total = Math.round(h * 60 + m)
    return total > 0 ? total : null
  }

  const minutesOnly = t.match(/^(\d+)\s*(?:minutes?|mins?|m)?$/)
  if (minutesOnly) {
    const total = Number(minutesOnly[1])
    return total > 0 ? total : null
  }

  return null
}

export function formatDurationMinutes(value: number | null | undefined): string {
  if (!value || value <= 0) return ''
  const h = Math.floor(value / 60)
  const m = value % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

export function homeAirportCodesFromContext(
  context: FlightDirectionContext
): Set<string> {
  const codes = new Set<string>()
  const preferred = normalizeAirportCode(context.preferredAirportCode ?? '')
  if (preferred.length === 3) codes.add(preferred)

  const text = [context.startingLocation, context.homeState].filter(Boolean).join(' ')
  if (/\barlington\b/i.test(text) || /\bVA\b/i.test(text) || /\bvirginia\b/i.test(text)) {
    codes.add('IAD')
    codes.add('DCA')
    codes.add('BWI')
  }

  return codes
}

export function classifyFlightDirections(
  rows: TripFlightFormRow[],
  context: FlightDirectionContext
): TripFlightFormRow[] {
  const homeAirports = homeAirportCodesFromContext(context)
  if (homeAirports.size === 0) return rows

  return rows.map((row) => {
    const dep = normalizeAirportCode(row.departureAirportCode)
    const arr = normalizeAirportCode(row.arrivalAirportCode)
    if (dep && homeAirports.has(dep) && arr && !homeAirports.has(arr)) {
      return { ...row, direction: 'OUTBOUND' }
    }
    if (arr && homeAirports.has(arr) && dep && !homeAirports.has(dep)) {
      return { ...row, direction: 'RETURN' }
    }
    return row
  })
}

/** DB payload for TripFlight.create from a form row. */
export function formRowToDbData(row: TripFlightFormRow, sortOrder: number) {
  return {
    direction: row.direction,
    airlineName: row.airlineName.trim() || null,
    airlineCode: normalizeAirportCode(row.airlineCode) || null,
    flightNumber: row.flightNumber.trim() || null,
    departureAirportCode: normalizeAirportCode(row.departureAirportCode) || null,
    arrivalAirportCode: normalizeAirportCode(row.arrivalAirportCode) || null,
    departureTime: parseDatetimeLocal(row.departureTime),
    arrivalTime: parseDatetimeLocal(row.arrivalTime),
    durationMinutes: row.durationMinutes,
    confirmationCode: row.confirmationCode.trim() || null,
    notes: row.notes.trim() || null,
    sortOrder,
  }
}
