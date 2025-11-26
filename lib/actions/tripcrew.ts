/**
 * TripCrew Server Actions
 * 
 * Server actions for TripCrew operations (matching GoFast RunCrew pattern)
 * All actions are server-side and scoped by traveler authentication
 */

'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Create TripCrew
 * Creates TripCrew, adds creator as member, and assigns admin role
 */
export async function createTripCrew(data: {
  name: string
  description?: string
  travelerId: string
}) {
  try {
    const { name, description, travelerId } = data

    // Verify traveler exists
    const traveler = await prisma.traveler.findUnique({
      where: { id: travelerId },
    })

    if (!traveler) {
      throw new Error('Traveler not found')
    }

    // Create TripCrew with membership and admin role in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create TripCrew
      const tripCrew = await tx.tripCrew.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          createdByTravelerId: travelerId,
        },
      })

      // Create membership (creator is automatically a member)
      await tx.tripCrewMember.create({
        data: {
          tripCrewId: tripCrew.id,
          travelerId: travelerId,
        },
      })

      // Create admin role (creator is automatically admin)
      await tx.tripCrewRole.create({
        data: {
          tripCrewId: tripCrew.id,
          travelerId: travelerId,
          role: 'admin',
        },
      })

      return tripCrew
    })

    revalidatePath('/tripcrews')
    revalidatePath(`/tripcrews/${result.id}`)

    return { success: true, tripCrew: result }
  } catch (error: any) {
    console.error('Create TripCrew error:', error)
    return { success: false, error: error.message || 'Failed to create TripCrew' }
  }
}

/**
 * Get TripCrew by ID (with security check)
 * Only returns if traveler is a member
 */
export async function getTripCrew(tripCrewId: string, travelerId: string) {
  try {
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

    // Get TripCrew with all relations
    const tripCrew = await prisma.tripCrew.findUnique({
      where: { id: tripCrewId },
      include: {
        memberships: {
          include: {
            traveler: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                photoURL: true,
              },
            },
          },
        },
        roles: {
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
        trips: {
          orderBy: { createdAt: 'desc' },
          include: {
            lodging: true,
            _count: {
              select: {
                dining: true,
                attractions: true,
                logistics: true,
                packItems: true,
              },
            },
          },
        },
      },
    })

    if (!tripCrew) {
      throw new Error('TripCrew not found')
    }

    return { success: true, tripCrew }
  } catch (error: any) {
    console.error('Get TripCrew error:', error)
    return { success: false, error: error.message || 'Failed to get TripCrew' }
  }
}

/**
 * Get all TripCrews for a traveler
 */
export async function getTravelerTripCrews(travelerId: string) {
  try {
    const memberships = await prisma.tripCrewMember.findMany({
      where: { travelerId },
      include: {
        tripCrew: {
          include: {
            trips: {
              orderBy: { createdAt: 'desc' },
              take: 3, // Latest 3 trips
            },
            _count: {
              select: {
                memberships: true,
                trips: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      success: true,
      tripCrews: memberships.map((m) => m.tripCrew),
    }
  } catch (error: any) {
    console.error('Get Traveler TripCrews error:', error)
    return { success: false, error: error.message || 'Failed to get TripCrews' }
  }
}

/**
 * Add member to TripCrew (by email)
 * Only admins can add members
 */
export async function addTripCrewMember(
  tripCrewId: string,
  travelerId: string,
  email: string
) {
  try {
    // Verify requester is admin
    const isAdmin = await prisma.tripCrewRole.findFirst({
      where: {
        tripCrewId,
        travelerId,
        role: 'admin',
      },
    })

    if (!isAdmin) {
      throw new Error('Only admins can add members')
    }

    // Find traveler by email
    const newMember = await prisma.traveler.findUnique({
      where: { email },
    })

    if (!newMember) {
      throw new Error('Traveler not found with that email')
    }

    // Check if already a member
    const existing = await prisma.tripCrewMember.findFirst({
      where: {
        tripCrewId,
        travelerId: newMember.id,
      },
    })

    if (existing) {
      throw new Error('Traveler is already a member')
    }

    // Add membership
    await prisma.tripCrewMember.create({
      data: {
        tripCrewId,
        travelerId: newMember.id,
      },
    })

    revalidatePath(`/tripcrews/${tripCrewId}`)

    return { success: true }
  } catch (error: any) {
    console.error('Add TripCrew Member error:', error)
    return { success: false, error: error.message || 'Failed to add member' }
  }
}

