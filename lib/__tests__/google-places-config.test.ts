import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { resolveGooglePlacesApiKey } from '../google-places-config'

describe('google-places-config', () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.GOOGLE_PLACES_API_KEY
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    delete process.env.GOOGLE_MAPS_API_KEY
  })

  afterEach(() => {
    process.env = env
  })

  it('prefers GOOGLE_PLACES_API_KEY when set', () => {
    process.env.GOOGLE_PLACES_API_KEY = ' places-key '
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'public-key'
    assert.equal(resolveGooglePlacesApiKey(), 'places-key')
  })

  it('falls back to NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = ' public-maps-key '
    assert.equal(resolveGooglePlacesApiKey(), 'public-maps-key')
  })

  it('returns null when unset', () => {
    assert.equal(resolveGooglePlacesApiKey(), null)
  })
})
