import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  emptyFlightRow,
  flightRowHasData,
  flightsToFormRows,
  normalizeAirportCode,
  parseDatetimeLocal,
} from '../trip-flight'

describe('trip-flight', () => {
  it('creates empty outbound and return rows by default', () => {
    const outbound = emptyFlightRow('OUTBOUND')
    assert.equal(outbound.direction, 'OUTBOUND')
    assert.equal(flightRowHasData(outbound), false)
  })

  it('orders flights outbound then return then others', () => {
    const rows = flightsToFormRows([
      {
        id: '1',
        tripId: 't1',
        direction: 'RETURN',
        airlineName: 'Delta',
        airlineCode: 'DL',
        flightNumber: '100',
        departureAirportCode: 'YUL',
        arrivalAirportCode: 'BOS',
        departureTime: new Date('2026-07-31T12:00:00'),
        arrivalTime: new Date('2026-07-31T14:00:00'),
        durationMinutes: null,
        confirmationCode: null,
        notes: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        tripId: 't1',
        direction: 'OUTBOUND',
        airlineName: 'Delta',
        airlineCode: 'DL',
        flightNumber: '99',
        departureAirportCode: 'BOS',
        arrivalAirportCode: 'YUL',
        departureTime: new Date('2026-07-29T08:00:00'),
        arrivalTime: new Date('2026-07-29T10:00:00'),
        durationMinutes: 120,
        confirmationCode: null,
        notes: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    assert.equal(rows[0].direction, 'OUTBOUND')
    assert.equal(rows[1].direction, 'RETURN')
    assert.equal(rows[0].departureAirportCode, 'BOS')
    assert.equal(rows[0].durationMinutes, 120)
  })

  it('normalizes airport codes', () => {
    assert.equal(normalizeAirportCode(' bos '), 'BOS')
  })

  it('parses datetime-local strings', () => {
    const dt = parseDatetimeLocal('2026-07-31T08:30')
    assert.ok(dt instanceof Date)
    assert.equal(Number.isNaN(dt!.getTime()), false)
  })
})
