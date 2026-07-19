import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveTripDayForEventDate,
  resolveTripDayForSlot,
} from '../trip-plan-ingest'

describe('trip-ingest-schedule helpers', () => {
  const tripDays = [
    { id: 'day-1', dayNumber: 1, date: new Date('2026-07-31T12:00:00.000Z') },
    { id: 'day-2', dayNumber: 2, date: new Date('2026-08-01T12:00:00.000Z') },
    { id: 'day-3', dayNumber: 3, date: new Date('2026-08-02T12:00:00.000Z') },
  ]

  it('resolves concert day from event date', () => {
    const day = resolveTripDayForEventDate(tripDays, '2026-08-01')
    assert.equal(day?.id, 'day-2')
  })

  it('resolves day slot by slotDate', () => {
    const day = resolveTripDayForSlot(tripDays, new Date('2026-07-31T12:00:00.000Z'), {
      type: 'dining',
      title: 'Dinner',
      startTime: null,
      endTime: null,
      address: null,
      notes: null,
      foodType: null,
      costLevel: null,
      idealTime: null,
      reservationRequired: null,
      description: null,
      category: null,
      subItems: [],
      slotDate: '2026-08-02',
      dayNumber: null,
    })
    assert.equal(day?.id, 'day-3')
  })
})
