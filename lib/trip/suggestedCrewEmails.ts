import { prisma } from '@/lib/prisma'

/**
 * Emails of other TripCrew members for this trip's crew (deduped, non-null).
 */
export async function getSuggestedCrewEmails(
  tripId: string,
  excludeTravelerId: string
): Promise<string[]> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { crewId: true },
  })
  if (!trip?.crewId) return []

  const members = await prisma.tripCrewMember.findMany({
    where: {
      tripCrewId: trip.crewId,
      travelerId: { not: excludeTravelerId },
    },
    include: {
      traveler: { select: { email: true } },
    },
  })

  const set = new Set<string>()
  for (const m of members) {
    const e = m.traveler.email?.trim().toLowerCase()
    if (e) set.add(e)
  }
  return [...set]
}

function normalizeEmail(e: string): string | null {
  const t = e.trim().toLowerCase()
  if (!t || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null
  return t
}

/**
 * Merges crew suggestions with manual addresses; dedupes; excludes sender's own email if passed.
 */
export function mergeRecipientEmails(
  crewEmails: string[],
  manual: string[] | undefined,
  excludeLowercase?: string | null
): { emails: string[]; invalid: string[] } {
  const invalid: string[] = []
  const set = new Set<string>()

  for (const raw of crewEmails) {
    const n = normalizeEmail(raw)
    if (n && n !== excludeLowercase) set.add(n)
  }

  if (manual?.length) {
    for (const raw of manual) {
      const n = normalizeEmail(raw)
      if (!n) {
        if (raw.trim()) invalid.push(raw.trim())
        continue
      }
      if (n === excludeLowercase) continue
      set.add(n)
    }
  }

  return { emails: [...set], invalid }
}

export { normalizeEmail }
