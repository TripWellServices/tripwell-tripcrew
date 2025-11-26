/**
 * Migration: Upsert TripWell Enterprises with UUID and link traveler
 * 
 * 1. Upsert TripWell Enterprises (let Prisma generate UUID)
 * 2. Update existing traveler (Adam Cole) to use that UUID
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting TripWell Enterprises UUID migration...')
  
  // Step 1: Create NEW TripWell Enterprises with UUID (standalone)
  console.log('📝 Creating NEW TripWell Enterprises with UUID...')
  
  // Create new enterprise (Prisma will generate UUID automatically)
  const enterprise = await prisma.tripWellEnterprise.create({
    data: {
      name: 'TripWell Enterprises',
      address: '2604 N. George Mason Dr., Arlington, VA 22207',
      description: 'Helping people enjoy traveling through intentional planning and connectedness',
    },
  })
  
  console.log('✅ TripWell Enterprises upserted:')
  console.log('   ID:', enterprise.id)
  console.log('   Name:', enterprise.name)
  console.log('   Address:', enterprise.address)
  console.log('   Description:', enterprise.description)
  
  // Step 2: Update ALL travelers to use this NEW enterprise ID
  console.log('\n🔗 Linking all travelers to NEW TripWell Enterprises...')
  
  const updateResult = await prisma.traveler.updateMany({
    data: {
      tripWellEnterpriseId: enterprise.id,
    },
  })
  
  console.log(`✅ Linked ${updateResult.count} travelers to NEW TripWell Enterprises`)
  
  // Step 3: Delete old enterprise (if it exists and is different)
  const oldEnterpriseId = 'tripwell-enterprises-master-container'
  if (enterprise.id !== oldEnterpriseId) {
    console.log('\n🗑️  Deleting old enterprise with hardcoded ID...')
    try {
      await prisma.tripWellEnterprise.delete({
        where: { id: oldEnterpriseId },
      })
      console.log('✅ Deleted old enterprise')
    } catch (e: any) {
      if (e.code === 'P2025') {
        console.log('ℹ️  Old enterprise already deleted or never existed')
      } else {
        console.error('⚠️  Could not delete old enterprise:', e.message)
      }
    }
  }
  
  // Step 3: Verify
  const allTravelers = await prisma.traveler.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      tripWellEnterpriseId: true,
    },
  })
  
  console.log('\n📋 Traveler Summary:')
  allTravelers.forEach((traveler) => {
    const status = traveler.tripWellEnterpriseId === enterprise.id ? '✅' : '❌'
    console.log(`   ${status} ${traveler.firstName || ''} ${traveler.lastName || ''} (${traveler.email || 'no email'}) - Enterprise: ${traveler.tripWellEnterpriseId || 'NULL'}`)
  })
  
  const unlinkedCount = allTravelers.filter(t => t.tripWellEnterpriseId !== enterprise.id).length
  if (unlinkedCount > 0) {
    console.error(`\n❌ WARNING: ${unlinkedCount} travelers still not linked!`)
  } else {
    console.log('\n✅ SUCCESS: All travelers linked to TripWell Enterprises!')
    console.log(`\n🎯 TripWell Enterprises ID: ${enterprise.id}`)
  }
  
  console.log('\n🎉 Migration complete!')
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

