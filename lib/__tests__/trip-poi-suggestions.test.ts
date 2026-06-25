import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeThingsToDoSuggestions } from '../trip-poi-suggestions'

describe('trip-poi-suggestions', () => {
  it('normalizes bucketed AI output with planner fields', () => {
    const result = normalizeThingsToDoSuggestions({
      mustDos: [
        {
          title: 'Old Montreal',
          type: 'neighborhood',
          whyMustDo: 'Cobblestone streets and festival energy before the show.',
          bestCombinedWith: 'Dinner in Vieux-Montréal',
          placeQuery: 'Old Montreal Quebec',
        },
      ],
      dining: [{ name: 'Joe Beef', detail: 'Reserve ahead' }],
      experiences: [],
    })

    assert.equal(result.mustDos.length, 1)
    assert.equal(result.mustDos[0].type, 'neighborhood')
    assert.equal(result.mustDos[0].whyMustDo, 'Cobblestone streets and festival energy before the show.')
    assert.equal(result.dining[0].title, 'Joe Beef')
  })

  it('caps must-dos at five', () => {
    const result = normalizeThingsToDoSuggestions({
      mustDos: Array.from({ length: 8 }, (_, i) => ({ title: `Place ${i + 1}` })),
      dining: [],
      experiences: [],
    })
    assert.equal(result.mustDos.length, 5)
  })
})
