/**
 * Traveler Find or Create Service
 * 
 * Handles finding existing travelers by firebaseId or creating new ones.
 * Uses Prisma upsert pattern for atomic find-or-create operation.
 * 
 * Pattern matches GoFast's AthleteFindOrCreateService
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ensureWishlistForTraveler } from '@/lib/ensure-wishlist'

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

    // Ensure TripWell Enterprises exists (find or create by name)
    let enterprise = await prisma.tripWellEnterprise.findFirst({
      where: { name: 'TripWell Enterprises' },
    })
    
    if (!enterprise) {
      // Create if doesn't exist (Prisma will generate UUID)
      enterprise = await prisma.tripWellEnterprise.create({
        data: {
          name: 'TripWell Enterprises',
          address: '2604 N. George Mason Dr., Arlington, VA 22207',
          description: 'Helping people enjoy traveling through intentional planning and connectedness',
        },
      })
      console.log('✅ TRAVELER SERVICE: Created TripWell Enterprises:', enterprise.id)
    } else {
      console.log('✅ TRAVELER SERVICE: Found TripWell Enterprises:', enterprise.id)
    }
    
    const enterpriseId = enterprise.id

    // Parse displayName into firstName/lastName if available
    const firstName = displayName?.split(' ')[0] || null
    const lastName = displayName?.split(' ').slice(1).join(' ') || null

    // Update only fields we actually received (GET hydrate sends firebaseId only — do not null out profile)
    const updatePayload: Prisma.TravelerUpdateInput = {
      tripWellEnterprise: { connect: { id: enterpriseId } },
    }
    if (email !== undefined && email !== null && String(email).trim() !== '') {
      updatePayload.email = String(email).trim()
    }
    if (displayName != null && String(displayName).trim() !== '') {
      const dn = String(displayName).trim()
      updatePayload.firstName = dn.split(' ')[0] || null
      updatePayload.lastName = dn.split(' ').slice(1).join(' ') || null
    }
    if (picture !== undefined) {
      updatePayload.photoURL =
        picture && String(picture).trim() ? String(picture).trim() : null
    }

    const traveler = await prisma.traveler.upsert({
      where: { firebaseId },
      update: updatePayload,
      create: {
        firebaseId,
        email: email || null,
        firstName,
        lastName,
        photoURL: picture || null, // Google profile picture from Firebase
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

    await ensureWishlistForTraveler(traveler.id).catch((e) => {
      console.error('ensureWishlistForTraveler failed:', e)
    })

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
        photoURL: traveler.photoURL,
        tripWellEnterpriseId: traveler.tripWellEnterpriseId,
        createdAt: traveler.createdAt,
        updatedAt: traveler.updatedAt,
      },
    }
  }
}

export default TravelerFindOrCreateService

