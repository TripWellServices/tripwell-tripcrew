import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  dayFromScheduleDate,
  lineupDateFromDay,
  lineupRowsToScheduleItems,
  scheduleItemToLineupRow,
  composeFestivalDescription,
} from '@/lib/concert-lineup'

describe('concert-lineup', () => {
  it('maps day number to calendar date from event start', () => {
    assert.equal(lineupDateFromDay('2026-07-31', 1), '2026-07-31')
    assert.equal(lineupDateFromDay('2026-07-31', 2), '2026-08-01')
  })

  it('derives day number from schedule date', () => {
    assert.equal(dayFromScheduleDate('2026-07-31', '2026-08-01'), 2)
  })

  it('converts lineup rows to schedule items', () => {
    const items = lineupRowsToScheduleItems(
      [{ day: 1, startTime: '20:30', endTime: '22:00', headliner: 'Tyler, The Creator' }],
      '2026-07-31'
    )
    assert.equal(items.length, 1)
    assert.equal(items[0].title, 'Tyler, The Creator')
    assert.equal(items[0].startTime, '20:30')
    assert.equal(items[0].date, '2026-07-31')
    assert.equal(items[0].artist, null)
  })

  it('loads schedule item back to lineup row', () => {
    const row = scheduleItemToLineupRow(
      {
        title: 'Olivia Rodrigo',
        date: '2026-08-01',
        startTime: '21:00',
        endTime: '22:30',
      },
      '2026-07-31'
    )
    assert.equal(row.headliner, 'Olivia Rodrigo')
    assert.equal(row.day, 2)
  })

  it('composes festival description sections', () => {
    const text = composeFestivalDescription({
      bagPolicy: 'Clear bags only',
      gettingThere: 'Metro to Jean-Drapeau',
      tips: ['Arrive early'],
    })
    assert.match(text, /Bag policy/)
    assert.match(text, /Getting there/)
    assert.match(text, /Tips/)
  })
})
