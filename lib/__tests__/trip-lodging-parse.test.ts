import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyExpediaHeuristics,
  dedupeNearbyDrafts,
  draftKeyFromTitle,
  emptyLodgingRow,
  extractNearbyDraftsHeuristic,
  lodgingRowHasData,
  lodgingRowToDbData,
  normalizeAiLodgingParse,
  normalizeNearbyAttractionDraft,
} from '../trip-lodging-parse'

const EXPEDIA_COMPACT = `Hyatt Place Montreal - Downtown
3 nights · 1 adult, 1 child · 1 room
Confirmation number151230RA031154
Expedia itinerary72073958999992`

const EXPEDIA_FULL = `${EXPEDIA_COMPACT}

Total $1,402.43
Room type: Room, 2 Queen Beds, City View
Nonsmoking

Things to do near your stay
Montréal: Guided Sightseeing River Cruise
4 out of 5
Museum of Illusions Montreal - 70+ Illusions to Explore
4 out of 5
Montreal: La Grande Roue de Montréal Entry Ticket
4 out of 5
Montréal: Guided Sightseeing River Cruise
4 out of 5`

describe('trip-lodging-parse', () => {
  it('normalizes AI lodging parse with booking fields and nearby drafts', () => {
    const result = normalizeAiLodgingParse({
      lodging: {
        title: 'Hyatt Place Montreal - Downtown',
        nights: 3,
        adultCount: 1,
        childCount: 1,
        roomCount: 1,
        confirmationNumber: '151230RA031154',
        providerItineraryNumber: '72073958999992',
        bookingProvider: 'Expedia',
        totalCost: 1402.43,
        currency: 'USD',
        roomType: 'Room, 2 Queen Beds, City View',
        breakfastIncluded: null,
      },
      nearbyAttractionDrafts: [
        {
          title: 'Montréal: Guided Sightseeing River Cruise',
          rating: 4,
          category: 'activity',
        },
        {
          title: 'Museum of Illusions Montreal - 70+ Illusions to Explore',
          rating: 4,
        },
      ],
    })

    assert.equal(result.lodging.title, 'Hyatt Place Montreal - Downtown')
    assert.equal(result.lodging.nights, 3)
    assert.equal(result.lodging.confirmationNumber, '151230RA031154')
    assert.equal(result.lodging.providerItineraryNumber, '72073958999992')
    assert.equal(result.lodging.bookingProvider, 'Expedia')
    assert.equal(result.lodging.totalCost, 1402.43)
    assert.equal(result.lodging.roomType, 'Room, 2 Queen Beds, City View')
    assert.equal(result.nearbyAttractionDrafts.length, 2)
    assert.equal(result.nearbyAttractionDrafts[0].source, 'expedia_nearby_stay')
  })

  it('applies Expedia heuristics to compact paste', () => {
    const row = applyExpediaHeuristics(EXPEDIA_COMPACT, emptyLodgingRow())
    assert.equal(row.title, 'Hyatt Place Montreal - Downtown')
    assert.equal(row.nights, 3)
    assert.equal(row.adultCount, 1)
    assert.equal(row.childCount, 1)
    assert.equal(row.roomCount, 1)
    assert.equal(row.confirmationNumber, '151230RA031154')
    assert.equal(row.providerItineraryNumber, '72073958999992')
    assert.equal(row.bookingProvider, 'Expedia')
  })

  it('extracts and dedupes nearby activity drafts from Expedia section', () => {
    const drafts = extractNearbyDraftsHeuristic(EXPEDIA_FULL)
    assert.equal(drafts.length, 3)
    assert.ok(drafts.some((d) => d.title.includes('River Cruise')))
    assert.ok(drafts.some((d) => d.title.includes('Museum of Illusions')))
    assert.ok(drafts.some((d) => d.title.includes('La Grande Roue')))

    const deduped = dedupeNearbyDrafts([
      ...drafts,
      {
        draftKey: draftKeyFromTitle('Montréal: Guided Sightseeing River Cruise'),
        title: 'Montréal: Guided Sightseeing River Cruise',
        source: 'expedia_nearby_stay',
        rating: 4,
      },
    ])
    assert.equal(deduped.length, 3)
  })

  it('normalizes nearby draft rows with draft keys', () => {
    const draft = normalizeNearbyAttractionDraft({
      title: 'Montreal: La Grande Roue de Montréal Entry Ticket',
      rating: '4',
    })
    assert.ok(draft)
    assert.equal(draft!.rating, 4)
    assert.equal(draft!.draftKey, draftKeyFromTitle(draft!.title))
  })

  it('maps lodging row to db data without requiring google place id', () => {
    const row = emptyLodgingRow()
    row.title = 'Hyatt Place Montreal - Downtown'
    row.confirmationNumber = '151230RA031154'
    row.totalCost = 1402.43
    row.currency = 'USD'

    assert.ok(lodgingRowHasData(row))
    const data = lodgingRowToDbData(row)
    assert.equal(data.title, 'Hyatt Place Montreal - Downtown')
    assert.equal(data.confirmationNumber, '151230RA031154')
    assert.equal(data.googlePlaceId, null)
    assert.equal(String(data.totalCost), '1402.43')
  })
})
