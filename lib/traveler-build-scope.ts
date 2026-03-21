import { prisma } from '@/lib/prisma'

/** Wishlist row id for this traveler, if any. */
export async function wishlistIdForTraveler(travelerId: string): Promise<string | null> {
  const w = await prisma.wishlist.findUnique({
    where: { travelerId },
    select: { id: true },
  })
  return w?.id ?? null
}
