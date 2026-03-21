import { prisma } from '@/lib/prisma'

/** Count catalogue rows tagged with savedPlanId per plan (for list UI). */
export async function savedExperienceCountsByPlanIds(
  planIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (planIds.length === 0) return counts

  const bump = (planId: string | null, n: number) => {
    if (!planId) return
    counts.set(planId, (counts.get(planId) ?? 0) + n)
  }

  const [hc, cc, dc, ac] = await Promise.all([
    prisma.hike.groupBy({
      by: ['savedPlanId'],
      where: { savedPlanId: { in: planIds } },
      _count: { _all: true },
    }),
    prisma.concert.groupBy({
      by: ['savedPlanId'],
      where: { savedPlanId: { in: planIds } },
      _count: { _all: true },
    }),
    prisma.dining.groupBy({
      by: ['savedPlanId'],
      where: { savedPlanId: { in: planIds } },
      _count: { _all: true },
    }),
    prisma.attraction.groupBy({
      by: ['savedPlanId'],
      where: { savedPlanId: { in: planIds } },
      _count: { _all: true },
    }),
  ])

  for (const row of hc) bump(row.savedPlanId, row._count._all)
  for (const row of cc) bump(row.savedPlanId, row._count._all)
  for (const row of dc) bump(row.savedPlanId, row._count._all)
  for (const row of ac) bump(row.savedPlanId, row._count._all)

  return counts
}

const hikeInc = { city: true } as const
const concertInc = { city: true } as const
const diningInc = { city: true } as const
const attractionInc = { city: true } as const

/** Unified rows for plan detail (replaces legacy experienceWishlists include). */
export async function listSavedExperiencesForPlan(planId: string) {
  const [hikes, concerts, diningRows, attractions] = await Promise.all([
    prisma.hike.findMany({
      where: { savedPlanId: planId },
      orderBy: { updatedAt: 'desc' },
      include: hikeInc,
    }),
    prisma.concert.findMany({
      where: { savedPlanId: planId },
      orderBy: { updatedAt: 'desc' },
      include: concertInc,
    }),
    prisma.dining.findMany({
      where: { savedPlanId: planId },
      orderBy: { updatedAt: 'desc' },
      include: diningInc,
    }),
    prisma.attraction.findMany({
      where: { savedPlanId: planId },
      orderBy: { updatedAt: 'desc' },
      include: attractionInc,
    }),
  ])

  type Row = {
    id: string
    title: string
    updatedAt: Date
    concert: unknown
    hike: unknown
    dining: unknown
    attraction: unknown
  }

  const rows: Row[] = [
    ...hikes.map((hike) => ({
      id: hike.id,
      title: hike.name,
      updatedAt: hike.updatedAt,
      concert: null,
      hike,
      dining: null,
      attraction: null,
    })),
    ...concerts.map((concert) => ({
      id: concert.id,
      title: concert.name,
      updatedAt: concert.updatedAt,
      concert,
      hike: null,
      dining: null,
      attraction: null,
    })),
    ...diningRows.map((dining) => ({
      id: dining.id,
      title: dining.title,
      updatedAt: dining.updatedAt,
      concert: null,
      hike: null,
      dining,
      attraction: null,
    })),
    ...attractions.map((attraction) => ({
      id: attraction.id,
      title: attraction.title,
      updatedAt: attraction.updatedAt,
      concert: null,
      hike: null,
      dining: null,
      attraction,
    })),
  ]

  rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  return rows.map(({ updatedAt: _, ...rest }) => rest)
}
