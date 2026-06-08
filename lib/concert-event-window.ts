import { parseFlexibleDateOnly } from '@/lib/trip-plan-dates'

export type ConcertEventWindowInput = {
  eventDate?: string | null
  eventStartDate?: string | null
  eventStartTime?: string | null
  eventEndDate?: string | null
  eventEndTime?: string | null
  isFestival?: boolean | null
}

export type ParsedConcertEventWindow = {
  eventDate: Date | null
  eventStartDate: Date | null
  eventStartTime: string | null
  eventEndDate: Date | null
  eventEndTime: string | null
  isFestival: boolean
}

function parseDateField(v: unknown): Date | null {
  const ymd = parseFlexibleDateOnly(v)
  if (!ymd) return null
  return new Date(`${ymd}T12:00:00.000Z`)
}

function normTime(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t || null
}

/** Normalize concert event window fields; eventDate mirrors start date for legacy code. */
export function parseConcertEventWindow(
  input: ConcertEventWindowInput
): ParsedConcertEventWindow {
  const start =
    parseDateField(input.eventStartDate) ??
    parseDateField(input.eventDate)
  const end = parseDateField(input.eventEndDate) ?? start

  return {
    eventDate: start,
    eventStartDate: start,
    eventStartTime: normTime(input.eventStartTime),
    eventEndDate: end,
    eventEndTime: normTime(input.eventEndTime),
    isFestival: Boolean(input.isFestival),
  }
}

export type ConcertScheduleItemInput = {
  title?: string
  artist?: string | null
  stage?: string | null
  location?: string | null
  date?: string | null
  startTime?: string | null
  endTime?: string | null
  notes?: string | null
  sortOrder?: number | null
}

export type ParsedConcertScheduleItem = {
  title: string
  artist: string | null
  stage: string | null
  location: string | null
  date: Date | null
  startTime: string | null
  endTime: string | null
  notes: string | null
  sortOrder: number
}

export function parseConcertScheduleItems(
  raw: unknown
): ParsedConcertScheduleItem[] {
  if (!Array.isArray(raw)) return []
  const out: ParsedConcertScheduleItem[] = []
  raw.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return
    const row = item as ConcertScheduleItemInput
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    if (!title) return
    out.push({
      title,
      artist: normTime(row.artist),
      stage: normTime(row.stage),
      location: normTime(row.location),
      date: parseDateField(row.date),
      startTime: normTime(row.startTime),
      endTime: normTime(row.endTime),
      notes: normTime(row.notes),
      sortOrder:
        typeof row.sortOrder === 'number' && Number.isFinite(row.sortOrder)
          ? row.sortOrder
          : idx,
    })
  })
  return out
}
