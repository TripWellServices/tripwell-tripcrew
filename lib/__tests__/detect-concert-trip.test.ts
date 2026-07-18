import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ingestDraftLooksLikeConcert,
  parsedPlanIsConcertTrip,
  tripTextLooksLikeConcert,
} from '../trip/detectConcertTrip'

describe('detectConcertTrip', () => {
  it('detects festival keywords in trip text', () => {
    assert.equal(
      tripTextLooksLikeConcert('Osheaga Music Festival Trip to Montreal', ''),
      true
    )
    assert.equal(tripTextLooksLikeConcert('Beach week in Miami', ''), false)
  })

  it('detects parsed plan with event anchor', () => {
    assert.equal(
      parsedPlanIsConcertTrip({
        tripName: 'Montreal trip',
        startDate: '2026-07-30',
        endDate: '2026-08-02',
        city: 'Montreal',
        state: 'QC',
        country: 'Canada',
        whereFreeform: null,
        whoWith: null,
        transportMode: null,
        lodging: null,
        legs: [],
        notes: null,
        experiences: [],
        daySlots: [],
        eventAnchor: {
          name: 'Osheaga Music Festival',
          kind: 'festival',
          artist: null,
          venue: null,
          eventDate: '2026-08-01',
          ticketStatus: null,
          confirmationNotes: null,
        },
        ingestType: 'mixed-confirmed-trip',
      }),
      true
    )
  })

  it('detects ingest draft from imported plan', () => {
    assert.equal(
      ingestDraftLooksLikeConcert({
        tripName: 'Montreal',
        purpose: '',
        importedPlan: {
          tripName: 'Montreal',
          startDate: null,
          endDate: null,
          city: 'Montreal',
          state: null,
          country: null,
          whereFreeform: null,
          whoWith: null,
          transportMode: null,
          lodging: null,
          legs: [],
          notes: null,
          experiences: [],
          daySlots: [],
          eventAnchor: {
            name: 'Osheaga',
            kind: 'festival',
            artist: null,
            venue: null,
            eventDate: null,
            ticketStatus: null,
            confirmationNotes: null,
          },
          ingestType: 'concert',
        },
      }),
      true
    )
  })
})
