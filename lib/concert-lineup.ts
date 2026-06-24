import { parseFlexibleDateOnly } from '@/lib/trip-plan-dates'
import type { ConcertScheduleItemInput } from '@/lib/concert-event-window'

/** Lightweight festival lineup row — no FK schedule-event concept. */
export type ConcertLineupRow = {
  day: number | ''
  startTime: string
  endTime: string
  headliner: string
}

export function emptyLineupRow(): ConcertLineupRow {
  return { day: '', startTime: '', endTime: '', headliner: '' }
}

export function lineupDateFromDay(
  eventStartDate: string | null | undefined,
  day: number | '' | null | undefined
): string | null {
  const ymd = parseFlexibleDateOnly(eventStartDate)
  if (!ymd) return null
  const dayNum = typeof day === 'number' ? day : parseInt(String(day ?? ''), 10)
  if (!Number.isFinite(dayNum) || dayNum < 1) return null
  const d = new Date(`${ymd}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + (dayNum - 1))
  return d.toISOString().slice(0, 10)
}

export function dayFromScheduleDate(
  eventStartDate: string | null | undefined,
  scheduleDate: string | Date | null | undefined
): number | '' {
  const startYmd = parseFlexibleDateOnly(eventStartDate)
  if (!startYmd || !scheduleDate) return ''
  const dateYmd =
    scheduleDate instanceof Date
      ? scheduleDate.toISOString().slice(0, 10)
      : parseFlexibleDateOnly(scheduleDate) ?? scheduleDate.slice(0, 10)
  if (!dateYmd) return ''
  const start = new Date(`${startYmd}T12:00:00.000Z`).getTime()
  const target = new Date(`${dateYmd}T12:00:00.000Z`).getTime()
  const diffDays = Math.round((target - start) / (1000 * 60 * 60 * 24))
  return diffDays >= 0 ? diffDays + 1 : ''
}

export function lineupRowsToScheduleItems(
  rows: ConcertLineupRow[],
  eventStartDate: string | null | undefined
): ConcertScheduleItemInput[] {
  return rows
    .map((row, sortOrder) => {
      const headliner = row.headliner.trim()
      if (!headliner) return null
      const dayNum = typeof row.day === 'number' ? row.day : parseInt(String(row.day), 10)
      const date =
        Number.isFinite(dayNum) && dayNum >= 1
          ? lineupDateFromDay(eventStartDate, dayNum)
          : null
      return {
        title: headliner,
        artist: null,
        stage: null,
        location: null,
        date,
        startTime: row.startTime.trim() || null,
        endTime: row.endTime.trim() || null,
        notes: null,
        sortOrder,
      }
    })
    .filter(Boolean) as ConcertScheduleItemInput[]
}

export function scheduleItemToLineupRow(
  item: {
    title: string
    date?: string | Date | null
    startTime?: string | null
    endTime?: string | null
  },
  eventStartDate: string | null | undefined
): ConcertLineupRow {
  return {
    day: dayFromScheduleDate(eventStartDate, item.date ?? null),
    startTime: item.startTime ?? '',
    endTime: item.endTime ?? '',
    headliner: item.title ?? '',
  }
}

export function composeFestivalDescription(parts: {
  notes?: string | null
  bagPolicy?: string | null
  gettingThere?: string | null
  tips?: string[] | null
}): string {
  const sections: string[] = []
  const notes = parts.notes?.trim()
  if (notes) sections.push(notes)

  const bag = parts.bagPolicy?.trim()
  if (bag) sections.push(`Bag policy\n${bag}`)

  const transit = parts.gettingThere?.trim()
  if (transit) sections.push(`Getting there\n${transit}`)

  const tips = (parts.tips ?? []).map((t) => t.trim()).filter(Boolean)
  if (tips.length) {
    sections.push(`Tips\n${tips.map((t) => `• ${t}`).join('\n')}`)
  }

  return sections.join('\n\n')
}

export function tipsFromMultilineText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
    .filter(Boolean)
}
