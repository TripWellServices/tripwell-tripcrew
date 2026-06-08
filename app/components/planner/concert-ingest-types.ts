import type { ParsedLodging, ParsedTripPlan } from '@/lib/trip-plan-model'

/** Concert Core — canonical source identity from ingest (not trip/lodging/schedule). */
export type ConcertCoreFields = {
  concertName: string
  artist: string
  venue: string
  description: string
  concertUrl: string
  eventStartDate: string
  eventStartTime: string
  eventEndDate: string
  eventEndTime: string
  city: string
  stateUS: string
  country: string
  isFestival: boolean
}

/** Optional wizard defaults from paste parse — not part of Concert Core. */
export type ConcertWizardDefaults = {
  tripName?: string
  startDate?: string
  endDate?: string
  lodgingTitle?: string
  lodgingAddress?: string
  lodgingCheckIn?: string
  lodgingCheckOut?: string
  importedPlan?: ParsedTripPlan | null
}

export type ConcertIngestDraft = ConcertCoreFields & {
  wizardDefaults?: ConcertWizardDefaults
}

export function emptyConcertCore(): ConcertCoreFields {
  return {
    concertName: '',
    artist: '',
    venue: '',
    description: '',
    concertUrl: '',
    eventStartDate: '',
    eventStartTime: '',
    eventEndDate: '',
    eventEndTime: '',
    city: '',
    stateUS: '',
    country: 'USA',
    isFestival: false,
  }
}

export function coreFromDraft(draft: Partial<ConcertIngestDraft>): ConcertCoreFields {
  const base = emptyConcertCore()
  return {
    concertName: draft.concertName?.trim() ?? base.concertName,
    artist: draft.artist?.trim() ?? base.artist,
    venue: draft.venue?.trim() ?? base.venue,
    description: draft.description?.trim() ?? base.description,
    concertUrl: draft.concertUrl?.trim() ?? base.concertUrl,
    eventStartDate: draft.eventStartDate ?? base.eventStartDate,
    eventStartTime: draft.eventStartTime ?? base.eventStartTime,
    eventEndDate: draft.eventEndDate ?? base.eventEndDate,
    eventEndTime: draft.eventEndTime ?? base.eventEndTime,
    city: draft.city?.trim() ?? base.city,
    stateUS: draft.stateUS?.trim() ?? base.stateUS,
    country: draft.country?.trim() || base.country,
    isFestival: draft.isFestival ?? base.isFestival,
  }
}

export function lodgingFromDefaults(
  defaults?: ConcertWizardDefaults
): ParsedLodging | null {
  if (!defaults?.lodgingTitle?.trim()) return null
  return {
    title: defaults.lodgingTitle.trim(),
    address: defaults.lodgingAddress?.trim() || null,
    defaultCheckInTime: defaults.lodgingCheckIn?.trim() || null,
    defaultCheckOutTime: defaults.lodgingCheckOut?.trim() || null,
    chain: null,
    lodgingType: null,
    notes: null,
  }
}
