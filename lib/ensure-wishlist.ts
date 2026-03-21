import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

/** One wishlist per traveler; created on demand with display name + unique slug. */
export async function ensureWishlistForTraveler(travelerId: string) {
  const existing = await prisma.wishlist.findUnique({ where: { travelerId } })
  if (existing) return existing

  const traveler = await prisma.traveler.findUnique({
    where: { id: travelerId },
    select: { firstName: true },
  })
  const name = traveler?.firstName?.trim()
    ? `${traveler.firstName.trim()}'s list`
    : 'My list'

  return prisma.wishlist.create({
    data: {
      travelerId,
      name,
      slug: randomUUID(),
    },
  })
}
