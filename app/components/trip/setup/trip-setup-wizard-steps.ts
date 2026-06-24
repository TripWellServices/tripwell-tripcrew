import type { ConcertLineupRow } from '@/lib/concert-lineup'
import type { TripFlightFormRow } from '@/lib/trip-flight'

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
    title: 'Flights',
    description: 'Outbound, return, and other flight legs',
  },
  {
    id: 'lodging',
    title: 'Stay',
    description: 'Where you are staying',
  },
  {
    id: 'poi',
    title: 'Things to do',
    description: 'Must dos, dining, and experiences for your trip list',
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
  flightRows: TripFlightFormRow[]
  flightNotes: string
  lodgingSet: boolean
  poiCount: number
  flightCount: number
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
    case 'flightInfo': {
      const filled = form.flightRows.filter(
        (r) =>
          r.airlineName.trim() ||
          r.flightNumber.trim() ||
          r.departureAirportCode.trim() ||
          r.arrivalAirportCode.trim()
      )
      if (filled.length >= 2) return 'complete'
      if (filled.length > 0 || form.flightNotes.trim() || form.logisticsCount > 0) {
        return 'partial'
      }
      return 'empty'
    }
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
