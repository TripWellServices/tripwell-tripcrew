/**
 * Trip Server Actions
 */

'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { computeTripMetadata } from '@/lib/trip/computeTripMetadata'
import { seedTripDays } from '@/lib/trip/seedTripDays'
import { TripType } from '@prisma/client'

export async function upsertTrip(data: {
  id?: string
  crewId: string
  /** @deprecated use purpose — kept for form compatibility */
  tripName?: string
  purpose?: string
  city?: string
  state?: string
  country?: string
  startDate: Date
  endDate?: Date
  travelerId: string
  tripType?: TripType
  whoWith?: import('@prisma/client').WhoWith
  transportMode?: import('@prisma/client').TransportMode
  startingLocation?: string
}) {
  try {
    const {
      id,
      crewId,
      tripName,
      purpose,
      city,
      state,
      country,
      startDate,
      travelerId,
      tripType,
      whoWith,
      transportMode,
      startingLocation,
    } = data

    const resolvedTripType = tripType ?? TripType.MULTI_DAY
    const endDate = resolvedTripType === TripType.SINGLE_DAY ? startDate : data.endDate

    const resolvedTitle = tripName?.trim() || 'Trip'
    const resolvedPurpose = purpose?.trim() ?? ''

    if (resolvedTripType === TripType.MULTI_DAY) {
      if (!city?.trim()) {
        throw new Error('City is required')
      }
      if (!country?.trim()) {
        throw new Error('Country is required')
      }
      if (!endDate || startDate > endDate) {
        throw new Error('End date must be on or after start date')
      }
    }

    const membership = await prisma.tripCrewMember.findFirst({
      where: { tripCrewId: crewId, travelerId },
    })
    if (!membership) {
      throw new Error('Not a member of this TripCrew')
    }

    const { daysTotal, season } = computeTripMetadata(startDate, endDate ?? startDate)

    const traveler = await prisma.traveler.findUnique({ where: { id: travelerId } })

    if (id) {
      const trip = await prisma.$transaction(async (tx) => {
        const updated = await tx.trip.update({
          where: { id },
          data: {
            title: resolvedTitle,
            purpose: resolvedPurpose,
            city: city?.trim() || null,
            state: state?.trim() || null,
            country: country?.trim() || null,
            startDate,
            endDate: endDate ?? startDate,
            daysTotal,
            season,
            tripType: resolvedTripType,
            whoWith: whoWith ?? undefined,
            transportMode: transportMode ?? undefined,
            startingLocation: startingLocation?.trim() || traveler?.homeAddress || null,
            travelerId,
          },
        })
        await tx.tripDay.deleteMany({ where: { tripId: id } })
        await seedTripDays(tx, {
          tripId: id,
          startDate,
          endDate: endDate ?? startDate,
        })
        return updated
      })

      revalidatePath(`/tripcrews/${crewId}`)
      revalidatePath(`/trip/${trip.id}`)
      revalidatePath(`/trip/${trip.id}/admin`)
      return { success: true, trip }
    }

    const trip = await prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({
        data: {
          crewId,
          travelerId,
          title: resolvedTitle,
          purpose: resolvedPurpose,
          city: city?.trim() || null,
          state: state?.trim() || null,
          country: country?.trim() || null,
          startDate,
          endDate: endDate ?? startDate,
          daysTotal,
          season,
          tripType: resolvedTripType,
          whoWith: whoWith ?? null,
          transportMode: transportMode ?? null,
          startingLocation: startingLocation?.trim() || traveler?.homeAddress || null,
        },
      })
      await seedTripDays(tx, {
        tripId: created.id,
        startDate,
        endDate: endDate ?? startDate,
      })
      return created
    })

    revalidatePath(`/tripcrews/${crewId}`)
    revalidatePath(`/trip/${trip.id}`)
    revalidatePath(`/trip/${trip.id}/admin`)

    return { success: true, trip }
  } catch (error: unknown) {
    console.error('Upsert Trip error:', error)
    const message = error instanceof Error ? error.message : 'Failed to upsert trip'
    return { success: false, error: message }
  }
}

export type GetTripResult =
  | { success: true; trip: NonNullable<Awaited<ReturnType<typeof fetchTripById>>> }
  | { success: false; error: string; code: 'NOT_FOUND' | 'SERVER_ERROR' }

async function fetchTripById(tripId: string) {
  return prisma.trip.findUnique({
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
        destinations: {
          orderBy: { order: 'asc' },
          include: { city: true },
        },
        tripDays: {
          orderBy: { dayNumber: 'asc' },
          include: {
            experiences: {
              orderBy: { orderIndex: 'asc' },
              include: {
                hike: true,
                dining: {
                  select: {
                    id: true,
                    title: true,
                    category: true,
                    address: true,
                    description: true,
                    metadata: true,
                  },
                },
                attraction: {
                  select: {
                    id: true,
                    title: true,
                    category: true,
                    address: true,
                    description: true,
                    metadata: true,
                  },
                },
                concert: true,
                sport: true,
                adventure: true,
                cruise: true,
              },
            },
          },
        },
        lodging: true,
        dining: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
          // Explicit select: production was missing whyMustDo/bestCombinedWith until migration 20260718230000.
          select: {
            id: true,
            tripId: true,
            tripWellEnterpriseId: true,
            cityId: true,
            title: true,
            category: true,
            address: true,
            phone: true,
            website: true,
            googlePlaceId: true,
            imageUrl: true,
            rating: true,
            lat: true,
            lng: true,
            description: true,
            metadata: true,
            distanceFromLodging: true,
            driveTimeMinutes: true,
            createdAt: true,
            updatedAt: true,
            createdById: true,
            wishlistId: true,
            savedByTravelerId: true,
          },
        },
        attractions: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            tripId: true,
            tripWellEnterpriseId: true,
            cityId: true,
            title: true,
            category: true,
            address: true,
            phone: true,
            website: true,
            googlePlaceId: true,
            imageUrl: true,
            rating: true,
            lat: true,
            lng: true,
            description: true,
            metadata: true,
            distanceFromLodging: true,
            driveTimeMinutes: true,
            createdAt: true,
            updatedAt: true,
            createdById: true,
            wishlistId: true,
            savedByTravelerId: true,
          },
        },
        adventures: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
        },
        flights: {
          where: { tripId },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        logistics: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
        },
        packItems: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
        },
        concertAnchors: {
          orderBy: { sortOrder: 'asc' },
          include: {
            concert: {
              include: {
                scheduleItems: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
      },
    })
}

export async function getTrip(tripId: string): Promise<GetTripResult> {
  try {
    const trip = await fetchTripById(tripId)

    if (!trip) {
      return { success: false, error: 'Trip not found', code: 'NOT_FOUND' }
    }

    return { success: true, trip }
  } catch (error: unknown) {
    console.error('Get Trip error:', error)
    const message = error instanceof Error ? error.message : 'Failed to get trip'
    return { success: false, error: message, code: 'SERVER_ERROR' }
  }
}
