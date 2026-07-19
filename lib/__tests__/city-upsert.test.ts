import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCityUpsertInput } from '../city-upsert'

describe('city-upsert', () => {
  it('preserves null state for international cities without a region', () => {
    assert.deepEqual(
      normalizeCityUpsertInput({
        name: ' Montreal ',
        state: null,
        country: ' Canada ',
      }),
      {
        name: 'Montreal',
        state: null,
        country: 'Canada',
      }
    )
  })

  it('normalizes state when present', () => {
    assert.deepEqual(
      normalizeCityUpsertInput({
        name: 'Arlington',
        state: ' VA ',
        country: 'USA',
      }),
      {
        name: 'Arlington',
        state: 'VA',
        country: 'USA',
      }
    )
  })
})
