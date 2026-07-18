import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseTripCoreCsv } from '../trip-core-csv'

describe('trip-core-csv', () => {
  it('parses a trip CSV row', () => {
    const csv = `tripName,purpose,city,state,country,startDate,endDate
Montreal weekend,Friends trip,Montreal,QC,Canada,2026-07-30,2026-08-02`

    const result = parseTripCoreCsv(csv)
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.draft.tripName, 'Montreal weekend')
    assert.equal(result.draft.city, 'Montreal')
    assert.equal(result.draft.startDate, '2026-07-30')
  })
})
