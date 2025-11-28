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

    // Map old fields to new fields (handle both old and new schema)
    if ('name' in trip && trip.name) {
      updates.tripName = trip.name
    } else if ('tripName' in trip && trip.tripName) {
      // Already migrated
      updates.tripName = trip.tripName
    } else {
      updates.tripName = 'Untitled Trip'
    }

    // Map crewId from tripCrewId (handle both old and new schema)
    if ('tripCrewId' in trip && trip.tripCrewId) {
      updates.crewId = trip.tripCrewId
    } else if ('crewId' in trip && trip.crewId) {
      // Already migrated
      updates.crewId = trip.crewId
    } else {
      // If no crewId, delete the orphaned trip
      console.log(`  ⚠️ Trip ${trip.id} has no crewId, deleting orphaned trip...`)
      await prisma.trip.delete({
        where: { id: trip.id },
      })
      continue
    }

    // Ensure required fields have defaults (handle both old and new schema)
    if ('purpose' in trip && trip.purpose) {
      updates.purpose = trip.purpose
    } else if (!('purpose' in trip)) {
      updates.purpose = 'Travel'
    }

    if ('city' in trip && trip.city) {
      updates.city = trip.city
    } else if (!('city' in trip)) {
      updates.city = 'Unknown'
    }

    if ('country' in trip && trip.country) {
      updates.country = trip.country
    } else if (!('country' in trip)) {
      updates.country = 'Unknown'
    }

    // Compute metadata if dates exist (handle both old and new schema)
    if (trip.startDate && trip.endDate) {
      const startDate = trip.startDate instanceof Date ? trip.startDate : new Date(trip.startDate)
      const endDate = trip.endDate instanceof Date ? trip.endDate : new Date(trip.endDate)
      const metadata = computeTripMetadata(startDate, endDate)
      updates.daysTotal = metadata.daysTotal
      updates.dateRange = metadata.dateRange
      updates.season = metadata.season
    } else if (!('daysTotal' in trip)) {
      // Default values if dates missing and not already computed
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

