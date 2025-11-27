/**
 * Migration Script: Trip Refactor Final
 * 
 * This script migrates existing Trip and TripCrew data to the new schema structure
 */

import { PrismaClient } from '@prisma/client'
import { computeTripMetadata } from '../lib/trip/computeTripMetadata'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Starting Trip Refactor Migration...')

  // Step 1: Update TripCrew - add joinCode if missing
  console.log('\n📦 Step 1: Updating TripCrew joinCode...')
  const allTripCrews = await prisma.tripCrew.findMany()
  const tripCrews = allTripCrews.filter((crew) => !crew.joinCode)

  for (const crew of tripCrews) {
    // Generate a unique join code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const codeLength = 6
    let code = ''
    for (let i = 0; i < codeLength; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const joinCode = code.toUpperCase()

    await prisma.tripCrew.update({
      where: { id: crew.id },
      data: { joinCode },
    })
    console.log(`  ✅ Updated TripCrew ${crew.id} with joinCode: ${joinCode}`)
  }

  // Step 2: Update existing Trips
  console.log('\n✈️ Step 2: Migrating existing Trips...')
  const trips = await prisma.trip.findMany()

  for (const trip of trips) {
    const updates: any = {}

    // Map old fields to new fields
    if (trip.name) {
      updates.tripName = trip.name
    } else {
      updates.tripName = 'Untitled Trip'
    }

    // Map crewId from tripCrewId
    if (trip.tripCrewId) {
      updates.crewId = trip.tripCrewId
    } else {
      // If no tripCrewId, delete the orphaned trip
      console.log(`  ⚠️ Trip ${trip.id} has no tripCrewId, deleting orphaned trip...`)
      await prisma.trip.delete({
        where: { id: trip.id },
      })
      continue
    }

    // Ensure required fields have defaults
    if (!trip.purpose) {
      updates.purpose = 'Travel'
    } else {
      updates.purpose = trip.purpose
    }

    if (!trip.city) {
      updates.city = 'Unknown'
    } else {
      updates.city = trip.city
    }

    if (!trip.country) {
      updates.country = 'Unknown'
    } else {
      updates.country = trip.country
    }

    // Compute metadata if dates exist
    if (trip.startDate && trip.endDate) {
      const metadata = computeTripMetadata(trip.startDate, trip.endDate)
      updates.daysTotal = metadata.daysTotal
      updates.dateRange = metadata.dateRange
      updates.season = metadata.season
    } else {
      // Default values if dates missing
      updates.daysTotal = 1
      updates.dateRange = 'TBD'
      updates.season = 'Unknown'
    }

    // Update the trip
    try {
      await prisma.trip.update({
        where: { id: trip.id },
        data: updates,
      })
      console.log(`  ✅ Migrated Trip ${trip.id}`)
    } catch (error: any) {
      console.error(`  ❌ Error migrating Trip ${trip.id}:`, error.message)
    }
  }

  console.log('\n✅ Migration complete!')
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

