import type { ParsedTripPlan } from '@/lib/trip-plan-model'

export type TripIngestDraft = {
  tripName: string
  purpose: string
  city: string
  state: string
  country: string
  startDate: string
  endDate: string
  startingLocation: string
  notes: string
  /** Full parsed plan from AI paste — passed to ingest-plan on create */
  importedPlan?: ParsedTripPlan | null
}

export function emptyTripIngestDraft(): TripIngestDraft {
  return {
    tripName: '',
    purpose: '',
    city: '',
    state: '',
    country: 'USA',
    startDate: '',
    endDate: '',
    startingLocation: '',
    notes: '',
    importedPlan: null,
  }
}
