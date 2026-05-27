import type { ParsedTripPlan } from '@/lib/trip-plan-types'

/** Osheaga-style confirmed trip fixture for parser/ingest regression tests. */
export const osheagaParsedPlanFixture: ParsedTripPlan = {
  tripName: 'Osheaga Montreal',
  startDate: '2026-07-31',
  endDate: '2026-08-02',
  city: 'Montreal',
  state: 'QC',
  country: 'Canada',
  whereFreeform: 'Montreal, QC, Canada',
  whoWith: null,
  transportMode: null,
  lodging: {
    title: 'Fairmont The Queen Elizabeth',
    address: '900 Rene-Levesque Blvd W, Montreal',
    chain: 'Fairmont',
    lodgingType: 'HOTEL',
    defaultCheckInTime: '4:00 PM',
    defaultCheckOutTime: '11:00 AM',
    notes: 'Confirmation #QE-88291',
  },
  legs: [],
  notes: 'Weekend pass purchased',
  experiences: [],
  eventAnchor: {
    name: 'Osheaga Music Festival',
    kind: 'festival',
    artist: null,
    venue: 'Parc Jean-Drapeau',
    eventDate: '2026-08-01',
    ticketStatus: '3-day pass confirmed',
    confirmationNotes: 'Order #OSH-2026-4412',
  },
  ingestType: 'mixed-confirmed-trip',
  daySlots: [
    {
      type: 'attraction',
      title: 'Old Montreal walking tour',
      startTime: '10:00',
      endTime: '12:00',
      address: 'Old Montreal',
      notes: null,
      foodType: null,
      costLevel: null,
      idealTime: null,
      reservationRequired: null,
      description: null,
      category: 'Sightseeing',
      subItems: [],
      slotDate: '2026-07-31',
      dayNumber: 1,
    },
    {
      type: 'dining',
      title: 'Schwartz Deli',
      startTime: '13:00',
      endTime: '14:00',
      address: '3895 Saint-Laurent Blvd',
      notes: 'Cash only',
      foodType: 'Deli',
      costLevel: 2,
      idealTime: 'lunch',
      reservationRequired: false,
      description: null,
      category: null,
      subItems: [],
      slotDate: '2026-08-01',
      dayNumber: 2,
    },
  ],
}

export const osheagaPasteBlob = `
Osheaga Music Festival — Montreal, QC
Dates: July 31 – August 2, 2026
Tickets: 3-day pass confirmed (Order #OSH-2026-4412)
Venue: Parc Jean-Drapeau

Hotel: Fairmont The Queen Elizabeth
900 Rene-Levesque Blvd W, Montreal
Check-in July 31, 4pm · Confirmation #QE-88291

Friday July 31: Old Montreal walking tour 10am–12pm
Saturday Aug 1: Schwartz Deli lunch 1pm
`.trim()
