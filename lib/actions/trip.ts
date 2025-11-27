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
 * Create Trip with Full Metadata (matching original TripBase structure)
 * Creates a new trip with all TripWell metadata fields
 */
export async function createTripWithMetadata(data: {
  tripCrewId: string
  name: string
  purpose: string // Free-form string (not enum) - users type custom purposes
  city: string
  country: string
  destination?: string // Optional convenience field (can be computed from city + country)
  startDate: Date
  endDate: Date
  partyCount?: number
  whoWith?: string // "spouse", "friends", "solo", "family", "other"
  // Optional new fields (not in original TripBase)
  tripType?: string
  budgetLevel?: string
  notes?: string
  attendees?: string[] // travelerId[] (TripCrew-specific)
  coverImage?: string
  travelerId: string // For security check
}) {
  try {
    const {
      tripCrewId,
      name,
      purpose,
      city,
      country,
      destination,
      startDate,
      endDate,
      partyCount,
      whoWith,
      tripType,
      budgetLevel,
      notes,
      attendees,
      coverImage,
      travelerId,
    } = data

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

    // Calculate daysTotal from dates
    const daysTotal = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Determine season from startDate (simple logic)
    const month = startDate.getMonth() + 1 // 1-12
    let season: string | null = null
    if (month >= 3 && month <= 5) season = 'Spring'
    else if (month >= 6 && month <= 8) season = 'Summer'
    else if (month >= 9 && month <= 11) season = 'Fall'
    else season = 'Winter'

    // Create trip with full metadata (matching original TripBase structure)
    const trip = await prisma.trip.create({
      data: {
        tripCrewId,
        name: name.trim(),
        purpose: purpose.trim(),
        city: city.trim(),
        country: country.trim(),
        destination: destination?.trim() || `${city.trim()}, ${country.trim()}`,
        startDate,
        endDate,
        partyCount: partyCount || 1,
        whoWith: whoWith || 'friends',
        season,
        daysTotal,
        // Optional new fields
        tripType: tripType?.trim() || null,
        budgetLevel: budgetLevel?.trim() || null,
        notes: notes?.trim() || null,
        attendees: attendees || [],
        coverImage: coverImage?.trim() || null,
      },
    })

    revalidatePath(`/tripcrews/${tripCrewId}`)
    revalidatePath(`/trip/${trip.id}`)
    revalidatePath(`/trip/${trip.id}/admin`)

    return { success: true, trip }
  } catch (error: any) {
    console.error('Create Trip with Metadata error:', error)
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
                    photoURL: true,
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

