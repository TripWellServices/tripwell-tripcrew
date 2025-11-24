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

  // Check if trip already exists
  const existingTrip = await prisma.trip.findFirst({
    where: {
      name: 'Cole Family Thanksgiving',
      ownerId: owner.id,
    },
  })

  const trip = existingTrip || await prisma.trip.create({
    data: {
      name: 'Cole Family Thanksgiving',
      destination: 'Richlands, VA',
      ownerId: owner.id,
      startDate: new Date('2024-11-28'),
      endDate: new Date('2024-12-01'),
    },
  })

  console.log('✅ Seeded trip:', trip.id)
  console.log('📍 Trip name:', trip.name)
  console.log('👤 Owner:', owner.firstName, owner.lastName)
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

