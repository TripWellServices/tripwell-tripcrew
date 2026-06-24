import type { ConcertLineupRow } from '@/lib/concert-lineup'

export type LineupRow = ConcertLineupRow

/** @deprecated Use LineupRow */
export type ScheduleRow = LineupRow

export type TripSetupStepId =
  | 'coreDetails'
  | 'musicEvent'
  | 'flightInfo'
  | 'lodging'
  | 'poi'

export type TripSetupStepInfo = {
  id: TripSetupStepId
  title: string
  description: string
}

export const BASE_SETUP_STEPS: TripSetupStepInfo[] = [
  {
    id: 'coreDetails',
    title: 'Core details',
    description: 'Trip title, purpose, destination, dates & transport',
  },
  {
    id: 'musicEvent',
    title: 'Music event',
    description: 'Festival or concert name, venue, schedule',
  },
  {
    id: 'flightInfo',
    title: 'Flight & travel',
    description: 'Flights, transfers, and travel logistics',
  },
  {
    id: 'lodging',
    title: 'Lodging',
    description: 'Where you are staying',
  },
  {
    id: 'poi',
    title: 'Places to go',
    description: 'Restaurants, beaches, trails, and sights',
  },
]

export type TripSetupFormState = {
  title: string
  purpose: string
  city: string
  state: string
  country: string
  startDate: string
  endDate: string
  transportMode: string
  startingLocation: string
  includesMusicEvent: boolean
  concertName: string
  concertArtist: string
  concertVenue: string
  concertUrl: string
  concertDescription: string
  eventStartDate: string
  eventEndDate: string
  eventStartTime: string
  eventEndTime: string
  isFestival: boolean
  scheduleRows: LineupRow[]
  flightOutbound: string
  flightReturn: string
  flightNotes: string
  lodgingSet: boolean
  poiCount: number
  logisticsCount: number
}

export function visibleSetupSteps(includesMusicEvent: boolean): TripSetupStepInfo[] {
  return BASE_SETUP_STEPS.filter(
    (s) => s.id !== 'musicEvent' || includesMusicEvent
  )
}

export function computeSetupStepStatus(
  stepId: TripSetupStepId,
  form: TripSetupFormState
): 'complete' | 'partial' | 'empty' {
  switch (stepId) {
    case 'coreDetails':
      if (form.title.trim() && form.city.trim() && form.startDate && form.endDate) {
        return 'complete'
      }
      if (form.title.trim() || form.city.trim()) return 'partial'
      return 'empty'
    case 'musicEvent':
      if (form.concertName.trim()) return 'complete'
      if (form.concertVenue.trim() || form.concertArtist.trim()) return 'partial'
      return 'empty'
    case 'flightInfo':
      if (form.flightOutbound.trim() || form.flightReturn.trim() || form.logisticsCount > 0) {
        return form.flightOutbound.trim() && form.flightReturn.trim()
          ? 'complete'
          : 'partial'
      }
      return 'empty'
    case 'lodging':
      return form.lodgingSet ? 'complete' : 'empty'
    case 'poi':
      return form.poiCount > 0 ? 'complete' : 'empty'
    default:
      return 'empty'
  }
}

export function countCompletedSetupSteps(
  form: TripSetupFormState,
  includesMusicEvent: boolean
): number {
  return visibleSetupSteps(includesMusicEvent).filter(
    (s) => computeSetupStepStatus(s.id, form) === 'complete'
  ).length
}

export function detectMusicTrip(input: {
  title?: string
  purpose?: string
}): boolean {
  const hay = `${input.title ?? ''} ${input.purpose ?? ''}`
  return /\b(festival|concert|osheaga|music|live\s+music|show)\b/i.test(hay)
}

/** @deprecated Use detectMusicTrip */
export function detectMusicTripFromPurpose(purpose: string): boolean {
  return detectMusicTrip({ purpose })
}
