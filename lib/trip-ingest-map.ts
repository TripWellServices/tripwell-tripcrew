import type { TripIngestDraft } from '@/lib/trip-ingest-types'
import type { ParsedTripPlan } from '@/lib/trip-plan-model'

export function draftFromParsedTripPlan(plan: ParsedTripPlan): TripIngestDraft {
  const anchor = plan.eventAnchor
  const eventStart = plan.startDate || anchor?.eventDate || ''
  const purpose =
    plan.notes?.trim() ||
    anchor?.confirmationNotes?.trim() ||
    (anchor?.name ? `Trip centered around ${anchor.name}.` : '')

  const tripName =
    plan.tripName?.trim() ||
    anchor?.name?.trim() ||
    ''

  return {
    tripName,
    purpose,
    city: plan.city?.trim() || '',
    state: plan.state?.trim() || '',
    country: plan.country?.trim() || 'USA',
    startDate: eventStart,
    endDate: plan.endDate || eventStart,
    startingLocation: '',
    notes: plan.notes?.trim() || '',
    importedPlan: plan,
  }
}
