/**
 * Trip Server Actions
 * 
 * Server actions for Trip operations
 */

'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { computeTripMetadata } from '@/lib/trip/computeTripMetadata'
import { TripCategory } from '@prisma/client'

/**
 * Upsert Trip (Create or Update)
 * Creates or updates a trip with computed metadata
 * Only members can create/update trips
 */
export async function upsertTrip(data: {
  id?: string
  crewId: string
  tripName: string
  purpose: string
  categories?: TripCategory[]
  city: string
  state?: string
  country: string
  startDate: Date
  endDate: Date
  travelerId: string // For security check
}) {
  try {
    const { id, crewId, tripName, purpose, categories, city, state, country, startDate, endDate, travelerId } = data

    // Validation
    if (!purpose.trim()) {
      throw new Error('Purpose is required')
    }
    if (!tripName.trim()) {
      throw new Error('Trip name is required')
    }
    if (!city.trim()) {
      throw new Error('City is required')
    }
    if (!country.trim()) {
      throw new Error('Country is required')
    }
    if (startDate >= endDate) {
      throw new Error('End date must be after start date')
    }

    // Verify traveler is a member
    const membership = await prisma.tripCrewMember.findFirst({
      where: {
        tripCrewId: crewId,
        travelerId,
      },
    })

    if (!membership) {
      throw new Error('Not a member of this TripCrew')
    }

    // Compute metadata
    const { daysTotal, dateRange, season } = computeTripMetadata(startDate, endDate)

    // Upsert trip
    const trip = await prisma.trip.upsert({
      where: { id: id ?? 'none' },
      create: {
        crewId,
        tripName: tripName.trim(),
        purpose: purpose.trim(),
        categories: categories || [],
        city: city.trim(),
        state: state?.trim() || null,
        country: country.trim(),
        startDate,
        endDate,
        daysTotal,
        dateRange,
        season,
      },
      update: {
        tripName: tripName.trim(),
        purpose: purpose.trim(),
        categories: categories || [],
        city: city.trim(),
        state: state?.trim() || null,
        country: country.trim(),
        startDate,
        endDate,
        daysTotal,
        dateRange,
        season,
      },
    })

    revalidatePath(`/tripcrews/${crewId}`)
    revalidatePath(`/trip/${trip.id}`)
    revalidatePath(`/trip/${trip.id}/admin`)

    return { success: true, trip }
  } catch (error: any) {
    console.error('Upsert Trip error:', error)
    return { success: false, error: error.message || 'Failed to upsert trip' }
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
        crew: {
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

