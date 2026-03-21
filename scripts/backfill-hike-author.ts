/**
 * One-off: set Hike.createdById for a hike that was saved before authorship existed.
 *
 *   BACKFILL_TRAVELER_ID=<uuid> npx tsx scripts/backfill-hike-author.ts
 *
 * Optional: BACKFILL_HIKE_ID (defaults to Maryland Heights example from prod debugging).
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const HIKE_ID =
  process.env.BACKFILL_HIKE_ID || '20a7ea6e-4052-4e48-8da3-fac45e51c18c'
const TRAVELER_ID = process.env.BACKFILL_TRAVELER_ID

async function main() {
  if (!TRAVELER_ID?.trim()) {
    console.error('Set BACKFILL_TRAVELER_ID to your Traveler.id (from profile / localStorage).')
    process.exit(1)
  }
  const hike = await prisma.hike.findUnique({ where: { id: HIKE_ID } })
  if (!hike) {
    console.error(`No hike with id ${HIKE_ID}`)
    process.exit(1)
  }
  if (hike.createdById) {
    console.log('Hike already has createdById:', hike.createdById)
    return
  }
  await prisma.hike.update({
    where: { id: HIKE_ID },
    data: { createdById: TRAVELER_ID.trim() },
  })
  console.log('Updated', HIKE_ID, '→ createdById', TRAVELER_ID.trim())
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
