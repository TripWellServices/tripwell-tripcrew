import { format } from "date-fns"

export function computeTripMetadata(startDate: Date, endDate: Date) {
  const ms = endDate.getTime() - startDate.getTime()
  const daysTotal = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1

  const startMonth = format(startDate, "MMM")
  const endMonth   = format(endDate, "MMM")
  const startDay   = format(startDate, "d")
  const endDay     = format(endDate, "d")
  const startYear  = format(startDate, "yyyy")
  const endYear    = format(endDate, "yyyy")

  let dateRange = ""
  if (startYear !== endYear) {
    dateRange = `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`
  } else if (startMonth !== endMonth) {
    dateRange = `${startMonth} ${startDay} – ${endMonth} ${endDay}`
  } else {
    dateRange = `${startMonth} ${startDay}–${endDay}`
  }

  const month = startDate.getMonth() + 1
  let season = ""
  if (month >= 3 && month <= 5) season = "Spring"
  else if (month >= 6 && month <= 8) season = "Summer"
  else if (month >= 9 && month <= 11) season = "Fall"
  else season = "Winter"

  return { daysTotal, dateRange, season }
}

/** Trip model persists daysTotal + season only; dateRange is optional for UI. */
export function tripPersistedMetadata(startDate: Date, endDate: Date) {
  const { daysTotal, season } = computeTripMetadata(startDate, endDate)
  return { daysTotal, season }
}

/** Legacy: derive display title from purpose blob (first segment before ". "). */
export function tripDisplayTitleFromPurpose(purpose: string | null | undefined) {
  const t = purpose?.trim()
  if (!t) return 'Trip'
  const dot = t.indexOf('. ')
  return dot > 0 ? t.slice(0, dot) : t
}

/** Prefer explicit title; fall back to legacy purpose split. */
export function resolveTripTitle(
  title: string | null | undefined,
  purpose?: string | null | undefined
) {
  const t = title?.trim()
  if (t) return t
  return tripDisplayTitleFromPurpose(purpose)
}

/** @deprecated Prefer resolveTripTitle(title, purpose). Still accepts purpose-only for legacy callers. */
export function tripDisplayTitle(purpose: string | null | undefined) {
  return tripDisplayTitleFromPurpose(purpose)
}

/**
 * Split legacy AI-ingested purpose blobs into title + purpose text for wizard forms.
 * Strips redundant "Where: …" lines when destination is already structured on the trip.
 */
export function splitLegacyPurposeBlob(
  purpose: string | null | undefined,
  title?: string | null
): { title: string; purposeText: string } {
  const raw = purpose?.trim() ?? ''
  const resolvedTitle = title?.trim() || tripDisplayTitleFromPurpose(raw)

  if (!raw) {
    return { title: resolvedTitle === 'Trip' ? '' : resolvedTitle, purposeText: '' }
  }

  if (title?.trim()) {
    return { title: title.trim(), purposeText: raw }
  }

  let remainder = raw
  if (remainder.startsWith(resolvedTitle)) {
    remainder = remainder.slice(resolvedTitle.length).replace(/^\.\s*/, '')
  }

  remainder = remainder.replace(/^Where:\s*[^.]+\.\s*/i, '').trim()

  return {
    title: resolvedTitle === 'Trip' ? raw : resolvedTitle,
    purposeText: remainder,
  }
}

export function tripDateRangeLabel(startDate: Date | string, endDate: Date | string) {
  return computeTripMetadata(new Date(startDate), new Date(endDate)).dateRange
}
