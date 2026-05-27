import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyIngestPlan,
  resolveTripDayForSlot,
  resolveTripDayForEventDate,
} from '@/lib/trip-plan-ingest'
import { osheagaParsedPlanFixture } from '@/lib/fixtures/osheaga-plan'
import type { ParsedTripPlan } from '@/lib/trip-plan-types'

const tripDays = [
  { id: 'd1', dayNumber: 1, date: new Date('2026-07-31T12:00:00.000Z') },
  { id: 'd2', dayNumber: 2, date: new Date('2026-08-01T12:00:00.000Z') },
  { id: 'd3', dayNumber: 3, date: new Date('2026-08-02T12:00:00.000Z') },
]

describe('trip-plan-ingest', () => {
  it('classifies Osheaga fixture as mixed confirmed trip', () => {
    assert.equal(classifyIngestPlan(osheagaParsedPlanFixture), 'mixed-confirmed-trip')
  })

  it('classifies event-only plans as concert', () => {
    const plan: ParsedTripPlan = {
      ...osheagaParsedPlanFixture,
      ingestType: null,
      lodging: null,
      legs: [],
      daySlots: [],
      eventAnchor: { name: 'Osheaga', kind: 'festival', artist: null, venue: null, eventDate: null, ticketStatus: null, confirmationNotes: null },
    }
    assert.equal(classifyIngestPlan(plan), 'concert')
  })

  it('maps day slots to correct trip days by slotDate', () => {
    const slots = osheagaParsedPlanFixture.daySlots
    const day1 = resolveTripDayForSlot(tripDays, tripDays[0].date, slots[0])
    const day2 = resolveTripDayForSlot(tripDays, tripDays[0].date, slots[1])
    assert.equal(day1?.id, 'd1')
    assert.equal(day2?.id, 'd2')
  })

  it('maps event anchor date to the matching trip day', () => {
    const day = resolveTripDayForEventDate(tripDays, '2026-08-01')
    assert.equal(day?.id, 'd2')
  })

  it('Osheaga fixture keeps July date range and day slot dates', () => {
    assert.equal(osheagaParsedPlanFixture.startDate, '2026-07-31')
    assert.equal(osheagaParsedPlanFixture.endDate, '2026-08-02')
    assert.equal(osheagaParsedPlanFixture.eventAnchor?.name, 'Osheaga Music Festival')
    assert.equal(osheagaParsedPlanFixture.daySlots[0].slotDate, '2026-07-31')
    assert.equal(osheagaParsedPlanFixture.daySlots[1].slotDate, '2026-08-01')
  })
})
