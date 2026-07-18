import type { ParsedTripPlan } from '@/lib/trip-plan-model'

const CONCERT_TEXT =
  /\b(festival|concert|osheaga|lollapalooza|bonnaroo|coachella|gov ball|pitchfork|music fest|live show|tour stop|headliner)\b/i

/** Heuristic: title/purpose text suggests a show-driven trip. */
export function tripTextLooksLikeConcert(
  title?: string | null,
  purpose?: string | null
): boolean {
  return CONCERT_TEXT.test(`${title ?? ''} ${purpose ?? ''}`)
}

/** Parsed ingest plan is concert/festival anchored or classified as such. */
export function parsedPlanIsConcertTrip(plan: ParsedTripPlan): boolean {
  if (plan.eventAnchor?.name?.trim()) return true
  if (plan.ingestType === 'concert') return true
  if (plan.ingestType === 'mixed-confirmed-trip' && plan.eventAnchor?.name?.trim()) {
    return true
  }
  return tripTextLooksLikeConcert(plan.tripName, plan.notes)
}

export function ingestDraftLooksLikeConcert(draft: {
  tripName?: string
  purpose?: string
  importedPlan?: ParsedTripPlan | null
}): boolean {
  if (draft.importedPlan) return parsedPlanIsConcertTrip(draft.importedPlan)
  return tripTextLooksLikeConcert(draft.tripName, draft.purpose)
}
