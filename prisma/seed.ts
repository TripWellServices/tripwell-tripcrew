import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const owner = await prisma.traveler.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      email: 'owner@example.com',
      firstName: 'Adam',
      lastName: 'Cole',
    },
  })

  // Generate joinCode
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const codeLength = 6
  let code = ''
  for (let i = 0; i < codeLength; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  const joinCode = code.toUpperCase()

  // Create TripCrew first
  const tripCrew = await prisma.tripCrew.upsert({
    where: { id: 'seed-tripcrew-id' },
    update: {},
    create: {
      id: 'seed-tripcrew-id',
      name: 'Cole Family TripCrew',
      joinCode,
      memberships: {
        create: {
          travelerId: owner.id,
        },
      },
      roles: {
        create: {
          travelerId: owner.id,
          role: 'admin',
        },
      },
    },
  })

  // Check if trip already exists
  const existingTrip = await prisma.trip.findFirst({
    where: {
      tripName: 'Cole Family Thanksgiving',
      crewId: tripCrew.id,
    },
  })

  const startDate = new Date('2024-11-28')
  const endDate = new Date('2024-12-01')
  
  // Compute metadata
  const { computeTripMetadata } = await import('../lib/trip/computeTripMetadata')
  const metadata = computeTripMetadata(startDate, endDate)

  const trip = existingTrip || await prisma.trip.create({
    data: {
      tripName: 'Cole Family Thanksgiving',
      purpose: 'Thanksgiving',
      city: 'Richlands',
      state: 'VA',
      country: 'USA',
      crewId: tripCrew.id,
      startDate,
      endDate,
      daysTotal: metadata.daysTotal,
      dateRange: metadata.dateRange,
      season: metadata.season,
    },
  })

  console.log('✅ Seeded TripCrew:', tripCrew.id)
  console.log('✅ Seeded trip:', trip.id)
  console.log('📍 Trip name:', trip.tripName)
  console.log('👤 Owner:', owner.firstName, owner.lastName)
  console.log('\n🌐 View TripCrew at:')
  console.log(`   http://localhost:3000/tripcrew/${tripCrew.id}`)
  console.log('\n🌐 View trip at:')
  console.log(`   http://localhost:3000/trip/${trip.id}`)
  console.log(`   http://localhost:3000/trip/${trip.id}?admin=1`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

