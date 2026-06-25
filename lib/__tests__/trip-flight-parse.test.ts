import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ensureOutboundReturnShape,
  matchAirline,
  normalizeAiFlightParse,
  parsedTripLegToFormRow,
  splitFlightNumber,
} from '../trip-flight-parse'

describe('trip-flight-parse', () => {
  it('splits combined flight numbers', () => {
    assert.deepEqual(splitFlightNumber('AA1234'), { airlineCode: 'AA', flightNumber: '1234' })
    assert.deepEqual(splitFlightNumber('B6789'), { airlineCode: 'B6', flightNumber: '789' })
    assert.deepEqual(splitFlightNumber('1234'), { airlineCode: '', flightNumber: '1234' })
  })

  it('matches known airlines', () => {
    assert.deepEqual(matchAirline('American Airlines', 'AA'), {
      airlineName: 'American Airlines',
      airlineCode: 'AA',
    })
    assert.deepEqual(matchAirline('Delta', null), {
      airlineName: 'Delta Air Lines',
      airlineCode: 'DL',
    })
  })

  it('normalizes AI flight rows', () => {
    const result = normalizeAiFlightParse({
      flights: [
        {
          direction: 'OUTBOUND',
          airlineName: 'Air Canada',
          flightNumber: 'AC8642',
          departureAirportCode: 'bos',
          arrivalAirportCode: 'yul',
          departureTime: '2026-07-29T08:15',
          confirmationCode: 'ABC123',
        },
        {
          direction: 'RETURN',
          airlineName: 'Air Canada',
          flightNumber: '8643',
          airlineCode: 'AC',
          departureAirportCode: 'YUL',
          arrivalAirportCode: 'BOS',
        },
      ],
      startingLocation: 'Boston, MA',
    })

    assert.equal(result.flights.length, 2)
    assert.equal(result.flights[0].direction, 'OUTBOUND')
    assert.equal(result.flights[0].departureAirportCode, 'BOS')
    assert.equal(result.flights[0].confirmationCode, 'ABC123')
    assert.equal(result.startingLocation, 'Boston, MA')
  })

  it('maps parsed trip legs to form rows', () => {
    const row = parsedTripLegToFormRow(
      {
        kind: 'flight',
        carrier: 'JetBlue Airways',
        flightNumber: 'B61234',
        origin: 'BOS',
        destination: 'MCO',
        depart: '2026-08-01T09:00:00',
        arrive: '2026-08-01T12:30:00',
        recordLocator: 'XYZ789',
      },
      0,
      1
    )

    assert.equal(row.airlineCode, 'B6')
    assert.equal(row.flightNumber, '1234')
    assert.equal(row.departureAirportCode, 'BOS')
    assert.equal(row.confirmationCode, 'XYZ789')
  })

  it('pads outbound and return slots', () => {
    const rows = ensureOutboundReturnShape([
      {
        direction: 'OUTBOUND',
        airlineName: 'United',
        airlineCode: 'UA',
        flightNumber: '100',
        departureAirportCode: 'EWR',
        arrivalAirportCode: 'YUL',
        departureTime: '',
        arrivalTime: '',
        confirmationCode: '',
        notes: '',
      },
    ])
    assert.equal(rows.length, 2)
    assert.equal(rows[1].direction, 'RETURN')
  })
})
