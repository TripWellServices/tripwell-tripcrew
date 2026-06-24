import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeThingsToDoSuggestions } from '../trip-poi-suggestions'

describe('trip-poi-suggestions', () => {
  it('normalizes bucketed AI output', () => {
    const result = normalizeThingsToDoSuggestions({
      mustDos: [{ title: 'Old Port', subtitle: 'Neighborhood', reason: 'Walkable' }],
      dining: [{ name: 'Joe Beef', detail: 'Reserve ahead' }],
      experiences: [],
    })

    assert.equal(result.mustDos.length, 1)
    assert.equal(result.mustDos[0].title, 'Old Port')
    assert.equal(result.dining[0].title, 'Joe Beef')
    assert.equal(result.experiences.length, 0)
  })
})
