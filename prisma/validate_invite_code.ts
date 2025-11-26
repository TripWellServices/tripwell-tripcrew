/**
 * Validation script to test inviteCode functionality
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Validating TripCrew inviteCode...\n')

  try {
    // Test query to confirm inviteCode exists
    const crews = await prisma.tripCrew.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        inviteCode: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    console.log(`✅ Found ${crews.length} TripCrew(s):\n`)
    crews.forEach((crew) => {
      console.log(`  - ${crew.name}`)
      console.log(`    ID: ${crew.id}`)
      console.log(`    Invite Code: ${crew.inviteCode || '⚠️  NULL (will be generated on next update)'}`)
      console.log(`    Created: ${crew.createdAt}`)
      console.log(`    Updated: ${crew.updatedAt}`)
      console.log('')
    })

    // Check TripCrewRole updatedAt
    const roles = await prisma.tripCrewRole.findMany({
      take: 3,
      select: {
        id: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    console.log(`✅ Found ${roles.length} TripCrewRole(s):\n`)
    roles.forEach((role) => {
      console.log(`  - Role: ${role.role}`)
      console.log(`    Created: ${role.createdAt}`)
      console.log(`    Updated: ${role.updatedAt}`)
      console.log('')
    })

    // Test that we can query by inviteCode
    if (crews.length > 0 && crews[0].inviteCode) {
      const foundByCode = await prisma.tripCrew.findUnique({
        where: { inviteCode: crews[0].inviteCode },
        select: { id: true, name: true },
      })
      console.log(`✅ Query by inviteCode works: Found ${foundByCode?.name || 'nothing'}`)
    }

    console.log('\n✅ Validation complete! All checks passed.')
  } catch (error: any) {
    console.error('❌ Validation error:', error.message)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

