/**
 * Migration: Fix TripWell Enterprises
 * 
 * 1. Add address field to TripWellEnterprise
 * 2. Upsert TripWell Enterprises with proper data
 * 3. Link all existing travelers to TripWell Enterprises
 * 
 * This ensures:
 * - TripWell Enterprises exists with proper name, address, description
 * - All travelers (including Adam Cole) are linked to it
 */

import { PrismaClient } from '@prisma/client'

// Hardcoded TripWell Enterprise ID (matches config/tripWellEnterpriseConfig.ts)
const TRIPWELL_ENTERPRISE_ID = 'tripwell-enterprises-master-container'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting TripWell Enterprises migration...')
  
  const enterpriseId = TRIPWELL_ENTERPRISE_ID
  console.log('📋 Enterprise ID:', enterpriseId)
  
  // Step 1: Upsert TripWell Enterprises with proper data
  console.log('📝 Upserting TripWell Enterprises...')
  const enterprise = await prisma.tripWellEnterprise.upsert({
    where: { id: enterpriseId },
    update: {
      name: 'TripWell Enterprises',
      address: '2604 N. George Mason Dr., Arlington, VA 22207',
      description: 'Helping people enjoy traveling through intentional planning and connectedness',
    },
    create: {
      id: enterpriseId,
      name: 'TripWell Enterprises',
      address: '2604 N. George Mason Dr., Arlington, VA 22207',
      description: 'Helping people enjoy traveling through intentional planning and connectedness',
    },
  })
  
  console.log('✅ TripWell Enterprises upserted:', enterprise.id)
  console.log('   Name:', enterprise.name)
  console.log('   Address:', enterprise.address)
  console.log('   Description:', enterprise.description)
  
  // Step 2: Find all travelers without tripWellEnterpriseId
  const travelersWithoutEnterprise = await prisma.traveler.findMany({
    where: {
      OR: [
        { tripWellEnterpriseId: null },
        { tripWellEnterpriseId: { not: enterpriseId } },
      ],
    },
  })
  
  console.log(`📊 Found ${travelersWithoutEnterprise.length} travelers to link`)
  
  // Step 3: Link all travelers to TripWell Enterprises
  if (travelersWithoutEnterprise.length > 0) {
    console.log('🔗 Linking travelers to TripWell Enterprises...')
    
    const updateResult = await prisma.traveler.updateMany({
      where: {
        OR: [
          { tripWellEnterpriseId: null },
          { tripWellEnterpriseId: { not: enterpriseId } },
        ],
      },
      data: {
        tripWellEnterpriseId: enterpriseId,
      },
    })
    
    console.log(`✅ Linked ${updateResult.count} travelers to TripWell Enterprises`)
  } else {
    console.log('✅ All travelers already linked')
  }
  
  // Step 4: Verify all travelers are linked
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
    const status = traveler.tripWellEnterpriseId === enterpriseId ? '✅' : '❌'
    console.log(`   ${status} ${traveler.firstName || ''} ${traveler.lastName || ''} (${traveler.email || 'no email'}) - Enterprise: ${traveler.tripWellEnterpriseId || 'NULL'}`)
  })
  
  const unlinkedCount = allTravelers.filter(t => t.tripWellEnterpriseId !== enterpriseId).length
  if (unlinkedCount > 0) {
    console.error(`\n❌ WARNING: ${unlinkedCount} travelers still not linked!`)
  } else {
    console.log('\n✅ SUCCESS: All travelers linked to TripWell Enterprises!')
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

