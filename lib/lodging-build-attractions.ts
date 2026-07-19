import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { NearbyAttractionDraft } from '@/lib/trip-lodging-parse'

export type BuildAttractionsResult = {
  created: Array<{ id: string; title: string; draftKey: string }>
  skipped: string[]
}

function metadataDraftKey(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const key = (metadata as Record<string, unknown>).draftKey
  return typeof key === 'string' && key.trim() ? key.trim() : null
}

export async function buildAttractionsFromLodgingDrafts(options: {
  tripId: string
  travelerId: string
  enterpriseId: string
  drafts: NearbyAttractionDraft[]
  selectedDraftKeys: string[]
}): Promise<BuildAttractionsResult> {
  const { tripId, travelerId, enterpriseId, drafts, selectedDraftKeys } = options
  const selected = new Set(selectedDraftKeys)
  const toBuild = drafts.filter((d) => selected.has(d.draftKey))
  if (!toBuild.length) {
    return { created: [], skipped: [] }
  }

  const existing = await prisma.attraction.findMany({
    where: { tripId },
    select: { id: true, title: true, metadata: true },
  })

  const existingKeys = new Set<string>()
  const existingTitles = new Set<string>()
  for (const row of existing) {
    const key = metadataDraftKey(row.metadata)
    if (key) existingKeys.add(key)
    existingTitles.add(row.title.trim().toLowerCase())
  }

  const created: BuildAttractionsResult['created'] = []
  const skipped: string[] = []

  for (const draft of toBuild) {
    const titleKey = draft.title.trim().toLowerCase()
    if (existingKeys.has(draft.draftKey) || existingTitles.has(titleKey)) {
      skipped.push(draft.draftKey)
      continue
    }

    const metadata: Prisma.InputJsonValue = {
      source: 'expedia_nearby_stay',
      draftKey: draft.draftKey,
      priceText: draft.priceText ?? null,
      distanceText: draft.distanceText ?? null,
      ingestProvider: draft.source,
    }

    const attraction = await prisma.attraction.create({
      data: {
        tripId,
        tripWellEnterpriseId: enterpriseId,
        title: draft.title.trim(),
        category: draft.category?.trim() || 'activity',
        rating: draft.rating ?? null,
        description: draft.description?.trim() || null,
        savedByTravelerId: travelerId,
        createdById: travelerId,
        metadata,
      },
      select: { id: true, title: true },
    })

    existingKeys.add(draft.draftKey)
    existingTitles.add(titleKey)
    created.push({ id: attraction.id, title: attraction.title, draftKey: draft.draftKey })
  }

  return { created, skipped }
}
