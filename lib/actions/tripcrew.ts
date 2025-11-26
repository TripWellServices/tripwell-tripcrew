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
 * Generate a unique join code
 * Ensures code is not already taken in JoinCode registry
 */
async function generateUniqueJoinCode(): Promise<string> {
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    // Generate a short, readable code (6-8 characters, uppercase)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars
    const codeLength = 6
    let code = ''
    for (let i = 0; i < codeLength; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const normalizedCode = code.toUpperCase()

    // Check if code exists in registry
    const existing = await prisma.joinCode.findUnique({
      where: { code: normalizedCode },
    })

    if (!existing) {
      return normalizedCode
    }

    attempts++
  }

  // Fallback to UUID-based code if random generation fails
  return `TW${Date.now().toString(36).toUpperCase().slice(-4)}`
}

/**
 * Create TripCrew
 * Creates TripCrew, adds creator as member, assigns admin role, and creates JoinCode registry entry
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

    // Create TripCrew with membership, admin role, and JoinCode in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate unique join code
      const joinCode = await generateUniqueJoinCode()

      // Create TripCrew
      const tripCrew = await tx.tripCrew.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          createdByTravelerId: travelerId,
          inviteCode: joinCode, // Legacy field for backward compatibility
        },
      })

      // Create JoinCode registry entry (authoritative source)
      await tx.joinCode.create({
        data: {
          code: joinCode,
          tripCrewId: tripCrew.id,
          isActive: true,
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

      return { tripCrew, joinCode }
    })

    revalidatePath('/tripcrews')
    revalidatePath(`/tripcrews/${result.tripCrew.id}`)

    return { success: true, tripCrew: result.tripCrew, joinCode: result.joinCode }
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
 * Lookup TripCrew by join code (via JoinCode registry)
 * Returns crew preview for unauthenticated users
 */
export async function lookupTripCrewByCode(joinCode: string) {
  try {
    if (!joinCode) {
      throw new Error('Join code is required')
    }

    // Normalize join code (uppercase, trimmed)
    const normalizedCode = joinCode.toUpperCase().trim()

    if (!normalizedCode) {
      throw new Error('Invalid join code')
    }

    // Find JoinCode record in registry
    let joinCodeRecord = await prisma.joinCode.findUnique({
      where: { code: normalizedCode },
      include: {
        tripCrew: {
          include: {
            _count: {
              select: { memberships: true, trips: true },
            },
            roles: {
              where: { role: 'admin' },
              take: 1,
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
      },
    })

    // If not in registry, check TripCrew.inviteCode (backward compatibility) and upsert
    if (!joinCodeRecord) {
      const tripCrew = await prisma.tripCrew.findUnique({
        where: { inviteCode: normalizedCode },
        include: {
          _count: {
            select: { memberships: true, trips: true },
          },
          roles: {
            where: { role: 'admin' },
            take: 1,
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
      })

      if (tripCrew) {
        // Upsert JoinCode record for backward compatibility
        joinCodeRecord = await prisma.joinCode.upsert({
          where: { code: normalizedCode },
          update: {
            isActive: true,
            expiresAt: null,
          },
          create: {
            code: normalizedCode,
            tripCrewId: tripCrew.id,
            isActive: true,
          },
          include: {
            tripCrew: {
              include: {
                _count: {
                  select: { memberships: true, trips: true },
                },
                roles: {
                  where: { role: 'admin' },
                  take: 1,
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
          },
        })
      }
    }

    if (!joinCodeRecord) {
      throw new Error('Invalid or expired join code')
    }

    // Check if code is active
    if (!joinCodeRecord.isActive) {
      throw new Error('Invalid or expired join code')
    }

    // Check if code is expired
    if (joinCodeRecord.expiresAt && joinCodeRecord.expiresAt < new Date()) {
      throw new Error('Invalid or expired join code')
    }

    const tripCrew = joinCodeRecord.tripCrew
    const admin = tripCrew.roles?.[0]?.traveler

    return {
      success: true,
      tripCrew: {
        id: tripCrew.id,
        name: tripCrew.name,
        description: tripCrew.description ?? undefined,
        memberCount: tripCrew._count.memberships,
        tripCount: tripCrew._count.trips,
        admin: admin
          ? {
              firstName: admin.firstName ?? '',
              lastName: admin.lastName ?? '',
              photoURL: admin.photoURL ?? undefined,
            }
          : null,
      },
    }
  } catch (error: any) {
    console.error('Lookup TripCrew error:', error)
    return { success: false, error: error.message || 'Failed to lookup TripCrew' }
  }
}

/**
 * Join TripCrew by invite code (via JoinCode registry)
 * Creates membership for the traveler
 * 
 * Supports both old signature (joinCode, travelerId) and new object signature
 */
export async function joinTripCrew(
  joinCodeOrOptions: string | { inviteCode: string; travelerId: string },
  travelerId?: string
) {
  // Handle both signatures for backward compatibility
  let joinCode: string
  let finalTravelerId: string

  if (typeof joinCodeOrOptions === 'string') {
    // Old signature: joinTripCrew(joinCode, travelerId)
    joinCode = joinCodeOrOptions
    if (!travelerId) {
      throw new Error('Traveler ID is required')
    }
    finalTravelerId = travelerId
  } else {
    // New signature: joinTripCrew({ inviteCode, travelerId })
    joinCode = joinCodeOrOptions.inviteCode
    finalTravelerId = joinCodeOrOptions.travelerId
  }

  if (!finalTravelerId) {
    throw new Error('Traveler ID is required')
  }
  try {
    // Normalize join code
    const normalizedCode = joinCode.toUpperCase().trim()

    // Find JoinCode record in registry
    let joinCodeRecord = await prisma.joinCode.findUnique({
      where: { code: normalizedCode },
      include: {
        tripCrew: true,
      },
    })

    // If not in registry, check TripCrew.inviteCode (backward compatibility)
    if (!joinCodeRecord) {
      const tripCrew = await prisma.tripCrew.findUnique({
        where: { inviteCode: normalizedCode },
      })

      if (tripCrew) {
        // Upsert JoinCode record
        joinCodeRecord = await prisma.joinCode.upsert({
          where: { code: normalizedCode },
          update: {
            isActive: true,
            expiresAt: null,
          },
          create: {
            code: normalizedCode,
            tripCrewId: tripCrew.id,
            isActive: true,
          },
          include: {
            tripCrew: true,
          },
        })
      }
    }

    if (!joinCodeRecord) {
      throw new Error('Invalid invite code')
    }

    // Check if code is active
    if (!joinCodeRecord.isActive) {
      throw new Error('Invalid or expired join code')
    }

    // Check if code is expired
    if (joinCodeRecord.expiresAt && joinCodeRecord.expiresAt < new Date()) {
      throw new Error('Invalid or expired join code')
    }

    const tripCrew = joinCodeRecord.tripCrew

    // Check if already a member
    const existing = await prisma.tripCrewMember.findFirst({
      where: {
        tripCrewId: tripCrew.id,
        travelerId: finalTravelerId,
      },
    })

    if (existing) {
      throw new Error('You are already a member of this TripCrew')
    }

    // Create membership
    await prisma.tripCrewMember.create({
      data: {
        tripCrewId: tripCrew.id,
        travelerId: finalTravelerId,
      },
    })

    revalidatePath('/tripcrews')
    revalidatePath(`/tripcrews/${tripCrew.id}`)

    return { success: true, tripCrewId: tripCrew.id, id: tripCrew.id }
  } catch (error: any) {
    console.error('Join TripCrew error:', error)
    return { success: false, error: error.message || 'Failed to join TripCrew' }
  }
}

/**
 * Generate invite link for TripCrew
 * Returns the full invite URL using JoinCode registry
 */
export async function generateInviteLink(tripCrewId: string, travelerId: string) {
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
      throw new Error('Only admins can generate invite links')
    }

    // Get active JoinCode from registry (preferred) or fallback to TripCrew.inviteCode
    let joinCode = await prisma.joinCode.findFirst({
      where: {
        tripCrewId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    })

    // Fallback to TripCrew.inviteCode if no active JoinCode
    if (!joinCode) {
      const tripCrew = await prisma.tripCrew.findUnique({
        where: { id: tripCrewId },
        select: { inviteCode: true },
      })

      if (!tripCrew || !tripCrew.inviteCode) {
        throw new Error('TripCrew not found or has no invite code')
      }

      // Create JoinCode registry entry from legacy inviteCode
      await prisma.joinCode.create({
        data: {
          code: tripCrew.inviteCode.toUpperCase(),
          tripCrewId,
          isActive: true,
        },
      })

      joinCode = { code: tripCrew.inviteCode.toUpperCase() }
    }

    // Generate invite URL (direct link to crew)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/join?code=${encodeURIComponent(joinCode.code)}`

    return { success: true, inviteUrl, inviteCode: joinCode.code }
  } catch (error: any) {
    console.error('Generate Invite Link error:', error)
    return { success: false, error: error.message || 'Failed to generate invite link' }
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

