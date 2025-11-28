/**
 * Populate joinCode for existing TripCrew rows
 * @deprecated This script is no longer needed - use migrate_trip_refactor.ts instead
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Populating joinCode for existing TripCrews...\n')

  try {
    // Find all TripCrews without joinCode
    const allCrews = await prisma.tripCrew.findMany({
      select: {
        id: true,
        name: true,
        joinCode: true,
      },
    })
    
    const crewsWithoutCode = allCrews.filter((crew) => !crew.joinCode)

    console.log(`Found ${crewsWithoutCode.length} TripCrew(s) without joinCode\n`)

    for (const crew of crewsWithoutCode) {
      // Generate a unique join code
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      const codeLength = 6
      let code = ''
      for (let i = 0; i < codeLength; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      const newJoinCode = code.toUpperCase()

      await prisma.tripCrew.update({
        where: { id: crew.id },
        data: { joinCode: newJoinCode },
      })
      console.log(`✅ Updated "${crew.name}" with joinCode: ${newJoinCode}`)
    }

    console.log(`\n✅ Successfully populated ${crewsWithoutCode.length} joinCode(s)`)
  } catch (error: any) {
    console.error('❌ Error populating joinCodes:', error.message)
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
