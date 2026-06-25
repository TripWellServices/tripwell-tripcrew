import type { ConcertLineupRow } from '@/lib/concert-lineup'
import type { TripFlightFormRow } from '@/lib/trip-flight'
import type { TripSetupOrigin } from '@prisma/client'

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
    description: 'Trip title, destination, and dates',
  },
  {
    id: 'musicEvent',
    title: 'Music event',
    description: 'Festival or concert name, venue, schedule',
  },
  {
    id: 'flightInfo',
    title: 'Flights',
    description: 'Leaving from, outbound, return, and other legs',
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

/** Serializable setup context passed from server — wizard must not re-derive path. */
export type TripSetupContextProps = {
  setupOrigin: TripSetupOrigin
  isConcertTrip: boolean
  showMusicStep: boolean
  concertAnchorId: string | null
  concertId: string | null
  concertName: string | null
  inferredTitle: string | null
}

export type TripSetupFormState = {
  title: string
  titleManuallyEdited: boolean
  purpose: string
  city: string
  state: string
  country: string
  startDate: string
  endDate: string
  startingLocation: string
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

export function visibleSetupSteps(showMusicStep: boolean): TripSetupStepInfo[] {
  return BASE_SETUP_STEPS.filter((s) => s.id !== 'musicEvent' || showMusicStep)
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
      if (
        filled.length > 0 ||
        form.flightNotes.trim() ||
        form.startingLocation.trim() ||
        form.logisticsCount > 0
      ) {
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
  showMusicStep: boolean
): number {
  return visibleSetupSteps(showMusicStep).filter(
    (s) => computeSetupStepStatus(s.id, form) === 'complete'
  ).length
}
