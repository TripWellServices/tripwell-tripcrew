/**
 * Traveler Find or Create Service
 * 
 * Handles finding existing travelers by firebaseId or creating new ones.
 * Uses Prisma upsert pattern for atomic find-or-create operation.
 * 
 * Pattern matches GoFast's AthleteFindOrCreateService
 */

import { prisma } from '@/lib/prisma'
import { getTripWellEnterpriseId } from '@/config/tripWellEnterpriseConfig'

export class TravelerFindOrCreateService {
  /**
   * Find or create Traveler by Firebase ID
   * Upserts all Firebase data (displayName → firstName/lastName, email, photoURL)
   * Links to TripWell Enterprises master container
   * 
   * @param firebaseData - Firebase user data
   * @returns Traveler object with all fields
   */
  static async findOrCreate(firebaseData: {
    firebaseId: string
    email?: string | null
    displayName?: string | null
    picture?: string | null
  }) {
    const { firebaseId, email, displayName, picture } = firebaseData

    if (!firebaseId) {
      throw new Error('firebaseId is required')
    }

    console.log('🔍 TRAVELER SERVICE: Finding or creating traveler for firebaseId:', firebaseId)

    // Ensure TripWell Enterprises exists (upsert pattern - like GoFastCompany)
    const enterpriseId = getTripWellEnterpriseId()
    const enterprise = await prisma.tripWellEnterprise.upsert({
      where: { id: enterpriseId },
      update: {}, // No updates needed if exists
      create: {
        id: enterpriseId,
        name: 'TripWell Enterprises',
        description: 'Master container for all TripWell travelers',
      },
    })
    console.log('✅ TRAVELER SERVICE: TripWell Enterprises ready')

    // Parse displayName into firstName/lastName if available
    const firstName = displayName?.split(' ')[0] || null
    const lastName = displayName?.split(' ').slice(1).join(' ') || null

    // Use Prisma upsert for atomic find-or-create
    // If firebaseId exists, update with Firebase data (sync Firebase profile changes)
    // If not, create new traveler with Firebase data
    const traveler = await prisma.traveler.upsert({
      where: { firebaseId },
      update: {
        // Upsert all Firebase data - sync any changes from Firebase profile
        email: email || undefined, // Update email if changed in Firebase
        firstName, // Update firstName from displayName
        lastName, // Update lastName from displayName
        photoUrl: picture || null, // Update photoUrl from Firebase
      },
      create: {
        firebaseId,
        email: email || null,
        firstName,
        lastName,
        photoUrl: picture || null,
        tripWellEnterpriseId: enterpriseId, // Link to master container
      },
      include: {
        tripWellEnterprise: true,
        tripCrewMemberships: {
          include: {
            tripCrew: {
              include: {
                trips: {
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
      },
    })

    console.log('✅ TRAVELER SERVICE: Traveler found/created:', traveler.id)

    return traveler
  }

  /**
   * Format traveler response for frontend
   * 
   * @param traveler - Prisma traveler object
   * @returns Formatted traveler response
   */
  static formatResponse(traveler: any) {
    return {
      success: true,
      message: 'Traveler found or created',
      travelerId: traveler.id,
      data: {
        id: traveler.id,
        firebaseId: traveler.firebaseId,
        email: traveler.email,
        firstName: traveler.firstName,
        lastName: traveler.lastName,
        photoUrl: traveler.photoUrl,
        tripWellEnterpriseId: traveler.tripWellEnterpriseId,
        createdAt: traveler.createdAt,
        updatedAt: traveler.updatedAt,
      },
    }
  }
}

export default TravelerFindOrCreateService

