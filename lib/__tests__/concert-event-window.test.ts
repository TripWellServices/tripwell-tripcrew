import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseConcertEventWindow,
  parseConcertScheduleItems,
} from '@/lib/concert-event-window'
import { defaultTripDatesFromConcert } from '@/lib/concert-trip-ingest'

describe('concert-event-window', () => {
  it('parses event window and mirrors start into eventDate', () => {
    const window = parseConcertEventWindow({
      eventStartDate: '2026-08-01',
      eventEndDate: '2026-08-03',
      eventStartTime: '19:00',
      isFestival: true,
    })
    assert.equal(window.isFestival, true)
    assert.equal(window.eventStartTime, '19:00')
    assert.equal(window.eventDate?.toISOString().slice(0, 10), '2026-08-01')
    assert.equal(window.eventEndDate?.toISOString().slice(0, 10), '2026-08-03')
  })

  it('parses schedule rows with sort order', () => {
    const items = parseConcertScheduleItems([
      { title: 'Headliner', artist: 'Band', sortOrder: 2 },
      { title: '', artist: 'Skip me' },
      { title: 'Opener' },
    ])
    assert.equal(items.length, 2)
    assert.equal(items[0].title, 'Headliner')
    assert.equal(items[1].title, 'Opener')
    assert.equal(items[1].sortOrder, 2)
  })

  it('defaults trip dates from concert core', () => {
    const dates = defaultTripDatesFromConcert({
      name: 'Osheaga',
      eventStartDate: '2026-07-31',
      eventEndDate: '2026-08-02',
    })
    assert.equal(dates.startDate, '2026-07-31')
    assert.equal(dates.endDate, '2026-08-02')
  })
})
