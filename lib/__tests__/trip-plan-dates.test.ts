import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseFlexibleDateOnly,
  parseIncomingTripDate,
  dateOnlyToNoonISO,
} from '@/lib/trip-plan-dates'

describe('trip-plan-dates', () => {
  it('parses ISO date-only strings', () => {
    assert.equal(parseFlexibleDateOnly('2026-07-31'), '2026-07-31')
  })

  it('parses named July dates with year', () => {
    assert.equal(parseFlexibleDateOnly('July 22, 2026'), '2026-07-22')
    assert.equal(parseFlexibleDateOnly('Aug 1, 2026'), '2026-08-01')
  })

  it('avoids local/UTC drift when seeding trip days at noon UTC', () => {
    const d = parseIncomingTripDate('2026-07-31')
    assert.equal(d.toISOString(), '2026-07-31T12:00:00.000Z')
    assert.equal(dateOnlyToNoonISO('2026-07-31'), '2026-07-31T12:00:00.000Z')
  })

  it('returns null for invalid date text', () => {
    assert.equal(parseFlexibleDateOnly('not-a-date'), null)
    assert.equal(parseFlexibleDateOnly(''), null)
  })
})
