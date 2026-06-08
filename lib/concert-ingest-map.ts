import type { ConcertIngestDraft } from '@/app/components/planner/concert-ingest-types'
import type { ParsedTripPlan } from '@/lib/trip-plan-model'

export function draftFromParsedTripPlan(plan: ParsedTripPlan): ConcertIngestDraft {
  const anchor = plan.eventAnchor
  const eventStart = anchor?.eventDate || plan.startDate || ''
  const description =
    plan.notes?.trim() ||
    anchor?.confirmationNotes?.trim() ||
    ''

  const draft: ConcertIngestDraft = {
    concertName: anchor?.name || plan.tripName?.trim() || '',
    artist: anchor?.artist?.trim() || '',
    venue: anchor?.venue?.trim() || '',
    description,
    concertUrl: '',
    eventStartDate: eventStart,
    eventStartTime: '',
    eventEndDate: eventStart,
    eventEndTime: '',
    city: plan.city?.trim() || '',
    stateUS: plan.state?.trim() || '',
    country: plan.country?.trim() || 'USA',
    isFestival: false,
    wizardDefaults: {
      tripName: plan.tripName?.trim() || anchor?.name || undefined,
      startDate: plan.startDate || undefined,
      endDate: plan.endDate || undefined,
      lodgingTitle: plan.lodging?.title?.trim() || undefined,
      lodgingAddress: plan.lodging?.address?.trim() || undefined,
      lodgingCheckIn: plan.lodging?.defaultCheckInTime?.trim() || undefined,
      lodgingCheckOut: plan.lodging?.defaultCheckOutTime?.trim() || undefined,
      importedPlan: plan,
    },
  }

  return draft
}
