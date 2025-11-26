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
 * Get Trip by ID (with security check)
 * Only returns if traveler is a member of the TripCrew
 */
export async function getTrip(tripId: string, travelerId: string) {
  try {
    // Get trip with TripCrew
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        tripCrew: {
          include: {
            memberships: {
              where: { travelerId },
            },
          },
        },
        lodging: true,
        dining: {
          orderBy: { itineraryDay: 'asc' },
        },
        attractions: {
          orderBy: { itineraryDay: 'asc' },
        },
        logistics: {
          orderBy: { createdAt: 'desc' },
        },
        packItems: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!trip) {
      throw new Error('Trip not found')
    }

    // Verify traveler is a member
    if (trip.tripCrew.memberships.length === 0) {
      throw new Error('Not a member of this TripCrew')
    }

    return { success: true, trip }
  } catch (error: any) {
    console.error('Get Trip error:', error)
    return { success: false, error: error.message || 'Failed to get trip' }
  }
}

