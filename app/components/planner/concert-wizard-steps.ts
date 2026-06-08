export type WizardStepId =
  | 'concertCore'
  | 'concertSchedule'
  | 'tripCore'
  | 'destination'
  | 'lodging'
  | 'poi'
  | 'paste'

export type WizardStepInfo = {
  id: WizardStepId
  title: string
  description: string
}

export const WIZARD_STEPS: WizardStepInfo[] = [
  {
    id: 'concertCore',
    title: 'Concert core',
    description: 'Name, venue, city, event window',
  },
  {
    id: 'concertSchedule',
    title: 'Concert schedule',
    description: 'Stages, sets, and day rows',
  },
  {
    id: 'tripCore',
    title: 'Trip core',
    description: 'Trip name, dates, who & transport',
  },
  {
    id: 'destination',
    title: 'Destination',
    description: 'Auto-seeded from concert city',
  },
  {
    id: 'lodging',
    title: 'Lodging',
    description: 'Hotel FK on your trip',
  },
  {
    id: 'poi',
    title: 'Around the show',
    description: 'Dining & attraction wishlist',
  },
  {
    id: 'paste',
    title: 'Paste details',
    description: 'Optional AI parse from tickets',
  },
]

export type ScheduleRow = {
  title: string
  artist: string
  stage: string
  location: string
  date: string
  startTime: string
  endTime: string
  notes: string
}

export type PoiRow = {
  kind: 'attraction' | 'dining'
  title: string
  category: string
}

export type ConcertWizardFormState = {
  concertName: string
  artist: string
  venue: string
  description: string
  city: string
  stateUS: string
  country: string
  concertUrl: string
  eventStartDate: string
  eventStartTime: string
  eventEndDate: string
  eventEndTime: string
  isFestival: boolean
  scheduleRows: ScheduleRow[]
  tripName: string
  startDate: string
  endDate: string
  whoWith: string
  transportMode: string
  tripNotes: string
  lodgingTitle: string
  lodgingAddress: string
  lodgingCheckIn: string
  lodgingCheckOut: string
  poiRows: PoiRow[]
  blobText: string
}

export function computeStepStatus(
  stepId: WizardStepId,
  form: ConcertWizardFormState
): 'complete' | 'partial' | 'empty' {
  switch (stepId) {
    case 'concertCore':
      if (form.concertName.trim()) return 'complete'
      if (form.artist.trim() || form.venue.trim() || form.city.trim()) return 'partial'
      return 'empty'
    case 'concertSchedule': {
      const filled = form.scheduleRows.some((r) => r.title.trim())
      if (filled) return 'complete'
      return 'empty'
    }
    case 'tripCore':
      if (form.tripName.trim() && (form.startDate || form.endDate)) return 'complete'
      if (form.tripName.trim() || form.startDate || form.endDate) return 'partial'
      return 'empty'
    case 'destination':
      if (form.city.trim()) return 'complete'
      return 'empty'
    case 'lodging':
      if (form.lodgingTitle.trim()) return 'complete'
      if (form.lodgingAddress.trim()) return 'partial'
      return 'empty'
    case 'poi':
      if (form.poiRows.some((r) => r.title.trim())) return 'complete'
      return 'empty'
    case 'paste':
      if (form.blobText.trim().length >= 20) return 'partial'
      return 'empty'
    default:
      return 'empty'
  }
}

export function countCompletedSteps(form: ConcertWizardFormState): number {
  return WIZARD_STEPS.filter(
    (s) => computeStepStatus(s.id, form) === 'complete'
  ).length
}
