import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isEssentialCategory, partitionDiningByEssentials } from '../trip-essentials'

describe('trip-essentials', () => {
  it('detects essential categories', () => {
    assert.equal(isEssentialCategory('Grocery'), true)
    assert.equal(isEssentialCategory('pharmacy'), true)
    assert.equal(isEssentialCategory('restaurant'), false)
  })

  it('partitions dining rows', () => {
    const rows = [
      { id: '1', title: 'Whole Foods', category: 'Grocery' },
      { id: '2', title: 'Joe Beef', category: 'restaurant' },
      { id: '3', title: 'CVS', category: 'Pharmacy' },
    ]
    const { essentials, regularDining } = partitionDiningByEssentials(rows)
    assert.equal(essentials.length, 2)
    assert.equal(regularDining.length, 1)
  })
})
