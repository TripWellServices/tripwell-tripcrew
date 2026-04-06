import { prisma } from '@/lib/prisma'

/**
 * Resolve a Trip destination (city / state / country strings) to a catalogue City id.
 * Tries progressively looser matches; if multiple cities share a name, returns null unless
 * state/country disambiguates (or only one row matches the name).
 */
export async function resolveCityId(
  city: string | null | undefined,
  state?: string | null | undefined,
  country?: string | null | undefined
): Promise<string | null> {
  const name = city?.trim()
  if (!name) return null

  const st = state?.trim() || undefined
  const co = country?.trim() || undefined

  if (st && co) {
    const hit = await prisma.city.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        state: { equals: st, mode: 'insensitive' },
        country: { equals: co, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (hit) return hit.id
  }

  if (st) {
    const hit = await prisma.city.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        state: { equals: st, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (hit) return hit.id
  }

  if (co) {
    const hit = await prisma.city.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        country: { equals: co, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (hit) return hit.id
  }

  const hits = await prisma.city.findMany({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
    take: 2,
  })
  if (hits.length === 1) return hits[0].id

  return null
}
