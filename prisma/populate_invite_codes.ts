/**
 * Populate inviteCode for existing TripCrew rows
 */

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Populating inviteCode for existing TripCrews...\n')

  try {
    // Find all TripCrews without inviteCode
    const crewsWithoutCode = await prisma.tripCrew.findMany({
      where: {
        inviteCode: null,
      },
      select: {
        id: true,
        name: true,
      },
    })

    console.log(`Found ${crewsWithoutCode.length} TripCrew(s) without inviteCode\n`)

    for (const crew of crewsWithoutCode) {
      const newInviteCode = randomUUID()
      await prisma.tripCrew.update({
        where: { id: crew.id },
        data: { inviteCode: newInviteCode },
      })
      console.log(`✅ Updated "${crew.name}" with inviteCode: ${newInviteCode}`)
    }

    console.log(`\n✅ Successfully populated ${crewsWithoutCode.length} inviteCode(s)`)
  } catch (error: any) {
    console.error('❌ Error populating inviteCodes:', error.message)
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

