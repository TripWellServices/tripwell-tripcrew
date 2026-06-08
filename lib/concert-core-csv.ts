import type { ConcertIngestDraft } from '@/app/components/planner/concert-ingest-types'
import { emptyConcertCore } from '@/app/components/planner/concert-ingest-types'

const HEADER_ALIASES: Record<string, keyof ConcertIngestDraft> = {
  name: 'concertName',
  concertname: 'concertName',
  concert: 'concertName',
  artist: 'artist',
  headliner: 'artist',
  venue: 'venue',
  description: 'description',
  desc: 'description',
  url: 'concertUrl',
  concerturl: 'concertUrl',
  link: 'concertUrl',
  eventstartdate: 'eventStartDate',
  startdate: 'eventStartDate',
  eventstarttime: 'eventStartTime',
  starttime: 'eventStartTime',
  eventenddate: 'eventEndDate',
  enddate: 'eventEndDate',
  eventendtime: 'eventEndTime',
  endtime: 'eventEndTime',
  city: 'city',
  state: 'stateUS',
  country: 'country',
  isfestival: 'isFestival',
  festival: 'isFestival',
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

function parseBool(v: string): boolean {
  const s = v.trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes' || s === 'y'
}

export type CsvCoreParseResult =
  | { ok: true; draft: ConcertIngestDraft }
  | { ok: false; error: string }

/**
 * Parse core CSV — first data row becomes Concert Core draft.
 * Canonical headers: name,artist,venue,description,url,eventStartDate,...
 */
export function parseConcertCoreCsv(text: string): CsvCoreParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) {
    return { ok: false, error: 'CSV needs a header row and at least one data row.' }
  }

  const headers = parseCsvLine(lines[0]).map(normHeader)
  const fieldKeys = headers.map((h) => HEADER_ALIASES[h] ?? null)

  let dataRow: string[] | null = null
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    if (cells.some((c) => c.trim())) {
      dataRow = cells
      break
    }
  }
  if (!dataRow) {
    return { ok: false, error: 'No data rows found in CSV.' }
  }

  const core = emptyConcertCore()
  const draft: ConcertIngestDraft = { ...core }

  fieldKeys.forEach((key, idx) => {
    if (!key) return
    const raw = dataRow![idx] ?? ''
    if (key === 'isFestival') {
      draft.isFestival = parseBool(raw)
      return
    }
    const val = raw.trim()
    if (!val) return
    switch (key) {
      case 'concertName':
        draft.concertName = val
        break
      case 'artist':
        draft.artist = val
        break
      case 'venue':
        draft.venue = val
        break
      case 'description':
        draft.description = val
        break
      case 'concertUrl':
        draft.concertUrl = val
        break
      case 'eventStartDate':
        draft.eventStartDate = val
        break
      case 'eventStartTime':
        draft.eventStartTime = val
        break
      case 'eventEndDate':
        draft.eventEndDate = val
        break
      case 'eventEndTime':
        draft.eventEndTime = val
        break
      case 'city':
        draft.city = val
        break
      case 'stateUS':
        draft.stateUS = val
        break
      case 'country':
        draft.country = val
        break
    }
  })

  if (!draft.concertName.trim()) {
    return { ok: false, error: 'CSV row must include name or concertName.' }
  }

  if (draft.eventStartDate && !draft.eventEndDate) {
    draft.eventEndDate = draft.eventStartDate
  }

  return { ok: true, draft }
}

export const CONCERT_CORE_CSV_TEMPLATE = `name,artist,venue,description,url,eventStartDate,eventStartTime,eventEndDate,eventEndTime,city,state,country,isFestival`
