import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { emptyFlightRow } from '../trip-flight'
import { shouldRejectEmptyFlightReplace } from '../trip-flight-save-guard'

describe('trip-flight-save-guard', () => {
  it('rejects empty replace when clearFlights is false', () => {
    assert.equal(
      shouldRejectEmptyFlightReplace([emptyFlightRow('OUTBOUND'), emptyFlightRow('RETURN')], false),
      true
    )
  })

  it('allows empty replace when clearFlights is true', () => {
    assert.equal(
      shouldRejectEmptyFlightReplace([emptyFlightRow('OUTBOUND')], true),
      false
    )
  })

  it('allows replace when at least one row has data', () => {
    const row = {
      ...emptyFlightRow('OUTBOUND'),
      airlineName: 'United',
      flightNumber: '8083',
      departureAirportCode: 'IAD',
      arrivalAirportCode: 'YUL',
    }
    assert.equal(shouldRejectEmptyFlightReplace([row], false), false)
  })
})
