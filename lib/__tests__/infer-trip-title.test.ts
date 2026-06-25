import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatTripTitle,
  inferConcertTripTitle,
  destinationLabel,
  isUnitedStates,
} from '../trip/inferTripTitle'

describe('inferTripTitle', () => {
  it('builds concert trip title with destination', () => {
    const title = inferConcertTripTitle({
      concertName: 'osheaga music festival',
      city: 'Montreal',
      state: 'QC',
      country: 'Canada',
    })
    assert.equal(title, 'Osheaga Music Festival Trip to Montreal')
  })

  it('labels US destinations with state', () => {
    assert.equal(
      destinationLabel({ city: 'Boston', state: 'MA', country: 'United States' }),
      'Boston, MA'
    )
  })

  it('labels international destinations as city only', () => {
    assert.equal(destinationLabel({ city: 'Montreal', state: 'QC', country: 'Canada' }), 'Montreal')
  })

  it('detects United States country variants', () => {
    assert.equal(isUnitedStates('USA'), true)
    assert.equal(isUnitedStates('Canada'), false)
  })

  it('title-cases Trip to phrasing', () => {
    assert.equal(formatTripTitle('osheaga trip to montreal'), 'Osheaga Trip to Montreal')
  })
})
