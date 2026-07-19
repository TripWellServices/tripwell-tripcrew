import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { NearbyAttractionDraft } from '../trip-lodging-parse'

function metadataDraftKey(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const key = (metadata as Record<string, unknown>).draftKey
  return typeof key === 'string' && key.trim() ? key.trim() : null
}

function planBuild(
  drafts: NearbyAttractionDraft[],
  selectedDraftKeys: string[],
  existing: Array<{ title: string; metadata: unknown }>
) {
  const selected = new Set(selectedDraftKeys)
  const toBuild = drafts.filter((d) => selected.has(d.draftKey))

  const existingKeys = new Set<string>()
  const existingTitles = new Set<string>()
  for (const row of existing) {
    const key = metadataDraftKey(row.metadata)
    if (key) existingKeys.add(key)
    existingTitles.add(row.title.trim().toLowerCase())
  }

  const created: string[] = []
  const skipped: string[] = []

  for (const draft of toBuild) {
    const titleKey = draft.title.trim().toLowerCase()
    if (existingKeys.has(draft.draftKey) || existingTitles.has(titleKey)) {
      skipped.push(draft.draftKey)
      continue
    }
    created.push(draft.draftKey)
    existingKeys.add(draft.draftKey)
    existingTitles.add(titleKey)
  }

  return { created, skipped }
}

describe('lodging-build-attractions planning', () => {
  const drafts: NearbyAttractionDraft[] = [
    {
      draftKey: 'montreal-guided-sightseeing-river-cruise',
      title: 'Montréal: Guided Sightseeing River Cruise',
      rating: 4,
      source: 'expedia_nearby_stay',
    },
    {
      draftKey: 'museum-of-illusions-montreal',
      title: 'Museum of Illusions Montreal - 70+ Illusions to Explore',
      rating: 4,
      source: 'expedia_nearby_stay',
    },
  ]

  it('creates only selected unscheduled attraction draft keys', () => {
    const result = planBuild(drafts, [drafts[0].draftKey], [])
    assert.deepEqual(result.created, [drafts[0].draftKey])
    assert.deepEqual(result.skipped, [])
  })

  it('skips duplicates by draft key or title', () => {
    const result = planBuild(drafts, drafts.map((d) => d.draftKey), [
      {
        title: 'Montréal: Guided Sightseeing River Cruise',
        metadata: { source: 'expedia_nearby_stay', draftKey: drafts[0].draftKey },
      },
    ])
    assert.deepEqual(result.created, [drafts[1].draftKey])
    assert.deepEqual(result.skipped, [drafts[0].draftKey])
  })
})
