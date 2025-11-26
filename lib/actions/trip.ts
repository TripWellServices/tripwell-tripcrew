/**
 * Trip Server Actions
 * 
 * Server actions for Trip operations
 */

'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Create Trip
 * Creates a new trip in a TripCrew
 * Only members can create trips
 */
export async function createTrip(data: {
  tripCrewId: string
  name: string
  destination?: string
  startDate?: Date
  endDate?: Date
  coverImage?: string
  travelerId: string // For security check
}) {
  try {
    const { tripCrewId, name, destination, startDate, endDate, coverImage, travelerId } = data

    // Verify traveler is a member
    const membership = await prisma.tripCrewMember.findFirst({
      where: {
        tripCrewId,
        travelerId,
      },
    })

    if (!membership) {
      throw new Error('Not a member of this TripCrew')
    }

    // Create trip
    const trip = await prisma.trip.create({
      data: {
        tripCrewId,
        name: name.trim(),
        destination: destination?.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        coverImage: coverImage || null,
      },
    })

    revalidatePath(`/tripcrews/${tripCrewId}`)
    revalidatePath(`/trips/${trip.id}`)

    return { success: true, trip }
  } catch (error: any) {
    console.error('Create Trip error:', error)
    return { success: false, error: error.message || 'Failed to create trip' }
  }
}

/**
 * Get Trip by ID (standard, safe, parent-aware hydration)
 * Standard Prisma query with explicit tripId filtering
 * No travelerId required - access control handled at page level
 */
export async function getTrip(tripId: string) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        tripCrew: {
          include: {
            memberships: {
              include: {
                traveler: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        lodging: true,
        dining: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
        },
        attractions: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
        },
        logistics: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
        },
        packItems: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!trip) {
      throw new Error('Trip not found')
    }

    return { success: true, trip }
  } catch (error: any) {
    console.error('Get Trip error:', error)
    return { success: false, error: error.message || 'Failed to get trip' }
  }
}

