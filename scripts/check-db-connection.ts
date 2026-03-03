/**
 * One-off script to verify Prisma can connect to the DB.
 * Run: npx tsx scripts/check-db-connection.ts
 * Or with explicit URL: DATABASE_PRISMA_DATABASE_URL="prisma+postgres://..." npx tsx scripts/check-db-connection.ts
 */
import { PrismaClient } from '@prisma/client'

async function main() {
  const url = process.env.DATABASE_PRISMA_DATABASE_URL
  if (!url) {
    console.error('❌ DATABASE_PRISMA_DATABASE_URL is not set.')
    console.error('   Set it in .env or run: DATABASE_PRISMA_DATABASE_URL="prisma+postgres://..." npx tsx scripts/check-db-connection.ts')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    await prisma.$connect()
    console.log('✅ Prisma connected to the database.')

    // Optional: one cheap query to confirm we can read
    const count = await prisma.tripCrew.count()
    console.log(`   TripCrew table: ${count} row(s).`)
  } catch (e) {
    console.error('❌ Connection failed:', e instanceof Error ? e.message : e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
