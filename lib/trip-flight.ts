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
  confirmationCode: string
  notes: string
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
