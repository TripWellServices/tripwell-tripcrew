import type { TripIngestDraft } from '@/lib/trip-ingest-types'
import { emptyTripIngestDraft } from '@/lib/trip-ingest-types'

export const TRIP_CORE_CSV_TEMPLATE =
  'tripName,purpose,city,state,country,startDate,endDate,startingLocation,notes'

const HEADER_ALIASES: Record<string, keyof TripIngestDraft> = {
  tripname: 'tripName',
  name: 'tripName',
  title: 'tripName',
  purpose: 'purpose',
  city: 'city',
  state: 'state',
  country: 'country',
  startdate: 'startDate',
  enddate: 'endDate',
  startinglocation: 'startingLocation',
  leavingfrom: 'startingLocation',
  notes: 'notes',
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

export type TripCsvParseResult =
  | { ok: true; draft: TripIngestDraft }
  | { ok: false; error: string }

/** Parse generic trip CSV — first data row becomes ingest draft. */
export function parseTripCoreCsv(text: string): TripCsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) {
    return { ok: false, error: 'CSV needs a header row and at least one data row.' }
  }

  const headers = parseCsvLine(lines[0]).map(normHeader)
  const values = parseCsvLine(lines[1])
  const draft = emptyTripIngestDraft()

  headers.forEach((header, index) => {
    const key = HEADER_ALIASES[header]
    if (!key) return
    const value = values[index]?.trim() ?? ''
    if (key === 'tripName') draft.tripName = value
    else if (key === 'purpose') draft.purpose = value
    else if (key === 'city') draft.city = value
    else if (key === 'state') draft.state = value
    else if (key === 'country') draft.country = value || 'USA'
    else if (key === 'startDate') draft.startDate = value
    else if (key === 'endDate') draft.endDate = value
    else if (key === 'startingLocation') draft.startingLocation = value
    else if (key === 'notes') draft.notes = value
  })

  if (!draft.tripName.trim()) {
    return { ok: false, error: 'CSV row must include tripName (or name/title).' }
  }

  return { ok: true, draft }
}
