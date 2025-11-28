/**
 * Set Join Code for TripCrew
 * 
 * Upserts JoinCode "Cole4Life" for the existing TripCrew
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Setting join code "Cole4Life" for TripCrew...\n')

  const joinCode = 'COLE4LIFE' // Normalized to uppercase

  try {
    // Find the TripCrew (assuming it's "Cole Family Adventures" or similar)
    const tripCrew = await prisma.tripCrew.findFirst({
      where: {
        OR: [
          { name: { contains: 'Cole', mode: 'insensitive' } },
          { name: { contains: 'Adventures', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        joinCode: true,
      },
    })

    if (!tripCrew) {
      console.error('❌ No TripCrew found. Please create a TripCrew first.')
      process.exit(1)
    }

    console.log(`✅ Found TripCrew: ${tripCrew.name} (${tripCrew.id})\n`)

    // Upsert JoinCode in registry
    const joinCodeRecord = await prisma.joinCode.upsert({
      where: { code: joinCode },
      update: {
        tripCrewId: tripCrew.id,
        isActive: true,
        expiresAt: null,
      },
      create: {
        code: joinCode,
        tripCrewId: tripCrew.id,
        isActive: true,
      },
    })

    console.log(`✅ JoinCode registry entry created/updated:`)
    console.log(`   Code: ${joinCodeRecord.code}`)
    console.log(`   TripCrew ID: ${joinCodeRecord.tripCrewId}`)
    console.log(`   Active: ${joinCodeRecord.isActive}\n`)

    // Update TripCrew.joinCode
    await prisma.tripCrew.update({
      where: { id: tripCrew.id },
      data: { joinCode: joinCode },
    })

    console.log(`✅ TripCrew.joinCode updated to: ${joinCode}\n`)

    // Generate invite URL
    const { appConfig } = await import('../config/appConfig')
    const inviteUrl = appConfig.getInviteUrl(joinCode)

    console.log('🎉 Join code set successfully!\n')
    console.log(`📋 Join Code: ${joinCode}`)
    console.log(`🔗 Invite URL: ${inviteUrl}\n`)
  } catch (error: any) {
    console.error('❌ Error setting join code:', error.message)
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

