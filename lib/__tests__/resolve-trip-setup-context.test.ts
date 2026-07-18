import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTripSetupContext } from '../trip/resolveTripSetupContext'

describe('resolveTripSetupContext', () => {
  it('marks concert ingest trips with music step', () => {
    const ctx = resolveTripSetupContext({
      setupOrigin: 'CONCERT_INGEST',
      title: 'Osheaga Music Festival Trip to Montreal',
      purpose: 'Festival weekend',
      city: 'Montreal',
      state: 'QC',
      country: 'Canada',
      concertAnchors: [
        {
          id: 'anchor-1',
          concert: { id: 'concert-1', name: 'Osheaga Music Festival' },
        },
      ],
    })

    assert.equal(ctx.isConcertTrip, true)
    assert.equal(ctx.showMusicStep, true)
    assert.equal(ctx.concertId, 'concert-1')
    assert.equal(ctx.inferredTitle, 'Osheaga Music Festival Trip to Montreal')
  })

  it('hides music step for generic trips without anchor', () => {
    const ctx = resolveTripSetupContext({
      setupOrigin: 'GENERIC',
      title: 'Beach week',
      purpose: 'Relaxing by the ocean',
      city: 'Miami',
      state: 'FL',
      country: 'United States',
      concertAnchors: [],
    })

    assert.equal(ctx.showMusicStep, true)
    assert.equal(ctx.isConcertTrip, false)
  })

  it('detects concert from trip title text', () => {
    const ctx = resolveTripSetupContext({
      setupOrigin: 'GENERIC',
      title: 'Osheaga Music Festival Trip to Montreal',
      purpose: 'Friends weekend',
      city: 'Montreal',
      state: 'QC',
      country: 'Canada',
      concertAnchors: [],
    })

    assert.equal(ctx.isConcertTrip, true)
    assert.equal(ctx.showMusicStep, true)
  })

  it('shows music step when legacy anchor exists', () => {
    const ctx = resolveTripSetupContext({
      setupOrigin: 'GENERIC',
      title: 'Trip',
      purpose: null,
      city: 'Boston',
      state: 'MA',
      country: 'United States',
      concertAnchors: [
        {
          id: 'anchor-2',
          concert: { id: 'c2', name: 'Boston Calling' },
        },
      ],
    })

    assert.equal(ctx.showMusicStep, true)
    assert.equal(ctx.isConcertTrip, true)
  })
})
