/**
 * TripCrew Server Actions
 * 
 * Server actions for TripCrew operations (matching GoFast RunCrew pattern)
 * All actions are server-side and scoped by traveler authentication
 */

'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { appConfig } from '@/config/appConfig'

/**
 * Slugify for handle (GoFast-style invite URL slug)
 */
function slugifyHandle(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'crew'
}

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
 * Generate unique handle (for GoFast-style invite URL)
 */
async function generateUniqueHandle(baseName: string): Promise<string> {
  const base = slugifyHandle(baseName || 'tripcrew')
  let handle = base
  let attempts = 0
  while (attempts < 20) {
    const existing = await prisma.tripCrew.findUnique({
      where: { handle },
    })
    if (!existing) return handle
    handle = `${base}-${Date.now().toString(36).slice(-4)}`
    attempts++
  }
  return `crew-${Date.now().toString(36)}`
}

/**
 * Create TripCrew
 * Creates TripCrew, adds creator as member, assigns admin role, and creates JoinCode registry entry
 */
export async function createTripCrew(data: {
  name: string
  travelerId: string
}) {
  try {
    const { name, travelerId } = data

    // Verify traveler exists
    const traveler = await prisma.traveler.findUnique({
      where: { id: travelerId },
    })

    if (!traveler) {
      throw new Error('Traveler not found')
    }

    // Create TripCrew with membership, admin role, handle (GoFast-style), and JoinCode in transaction
    const result = await prisma.$transaction(async (tx) => {
      const joinCode = await generateUniqueJoinCode()
      const handle = await generateUniqueHandle(name.trim() || 'tripcrew')

      // Create TripCrew (handle = primary invite slug)
      const tripCrew = await tx.tripCrew.create({
        data: {
          name: name.trim() || null,
          handle,
          joinCode,
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
              select: {
                id: true,
                tripName: true,
                city: true,
                state: true,
                country: true,
                dateRange: true,
                startDate: true,
                endDate: true,
              },
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
 * Normalize crew to preview shape
 */
function toCrewPreview(tripCrew: {
  id: string
  name: string | null
  _count: { memberships: number; trips: number }
  roles: Array<{
    traveler: { firstName: string | null; lastName: string | null; photoURL: string | null }
  }>
}) {
  const admin = tripCrew.roles?.[0]?.traveler
  return {
    id: tripCrew.id,
    name: tripCrew.name,
    memberCount: tripCrew._count.memberships,
    tripCount: tripCrew._count.trips,
    admin: admin
      ? {
          firstName: admin.firstName ?? '',
          lastName: admin.lastName ?? '',
          photoURL: admin.photoURL ?? undefined,
        }
      : null,
  }
}

/**
 * Lookup TripCrew by handle (GoFast-style) — primary invite path
 */
export async function lookupTripCrewByHandle(handle: string) {
  try {
    const slug = handle.trim().toLowerCase()
    if (!slug) return { success: false, error: 'Handle is required' }

    const tripCrew = await prisma.tripCrew.findUnique({
      where: { handle: slug },
      include: {
        _count: { select: { memberships: true, trips: true } },
        roles: {
          where: { role: 'admin' },
          take: 1,
          include: {
            traveler: {
              select: { id: true, firstName: true, lastName: true, photoURL: true },
            },
          },
        },
      },
    })

    if (!tripCrew) return { success: false, error: 'Crew not found' }
    return { success: true, tripCrew: toCrewPreview(tripCrew) }
  } catch (e: any) {
    return { success: false, error: e.message || 'Lookup failed' }
  }
}

/**
 * Lookup TripCrew by invite slug: try handle first (GoFast), then join code (legacy)
 */
export async function lookupTripCrewByInviteSlug(slug: string) {
  const s = slug.trim()
  if (!s) return { success: false, error: 'Invite link is invalid' }
  // Prefer handle if it looks like a handle (lowercase, may contain hyphen)
  const looksLikeHandle = s === s.toLowerCase() && /^[a-z0-9-]+$/.test(s) && s.length >= 2
  if (looksLikeHandle) {
    const byHandle = await lookupTripCrewByHandle(s)
    if (byHandle.success) return byHandle
  }
  return lookupTripCrewByCode(s)
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

    // If not in registry, check TripCrew.joinCode (backward compatibility) and upsert
    if (!joinCodeRecord) {
      const tripCrew = await prisma.tripCrew.findUnique({
        where: { joinCode: normalizedCode },
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
    return { success: true, tripCrew: toCrewPreview(tripCrew) }
  } catch (error: any) {
    console.error('Lookup TripCrew error:', error)
    return { success: false, error: error.message || 'Failed to lookup TripCrew' }
  }
}

/**
 * Resolve invite slug (handle or code) to tripCrewId
 */
async function resolveTripCrewIdBySlug(slug: string): Promise<string | null> {
  const lookup = await lookupTripCrewByInviteSlug(slug)
  if (!lookup.success || !lookup.tripCrew) return null
  return lookup.tripCrew.id
}

/**
 * Join TripCrew by invite slug (handle = GoFast-style) or invite code (legacy)
 * Creates membership for the traveler
 */
export async function joinTripCrew(
  joinCodeOrOptions:
    | string
    | { inviteCode: string; travelerId: string }
    | { inviteSlug: string; travelerId: string },
  travelerId?: string
) {
  let finalTravelerId: string
  let slugOrCode: string

  if (typeof joinCodeOrOptions === 'string') {
    slugOrCode = joinCodeOrOptions
    if (!travelerId) throw new Error('Traveler ID is required')
    finalTravelerId = travelerId
  } else {
    finalTravelerId = joinCodeOrOptions.travelerId
    slugOrCode =
      'inviteSlug' in joinCodeOrOptions
        ? joinCodeOrOptions.inviteSlug
        : joinCodeOrOptions.inviteCode
  }

  if (!finalTravelerId) throw new Error('Traveler ID is required')
  if (!slugOrCode?.trim()) throw new Error('Invite link or code is required')

  try {
    // Resolve slug (handle or code) to tripCrewId
    let tripCrewId: string | null = await resolveTripCrewIdBySlug(slugOrCode)

    if (!tripCrewId) {
      // Legacy: try by code only (uppercase)
      const normalizedCode = slugOrCode.toUpperCase().trim()
      const joinCodeRecord = await prisma.joinCode.findFirst({
        where: { code: normalizedCode, isActive: true },
        include: { tripCrew: true },
      })
      if (joinCodeRecord?.tripCrew) tripCrewId = joinCodeRecord.tripCrew.id
      if (!tripCrewId) throw new Error('Invalid or expired invite link')
    }

    const existing = await prisma.tripCrewMember.findFirst({
      where: { tripCrewId, travelerId: finalTravelerId },
    })
    if (existing) throw new Error('You are already a member of this TripCrew')

    await prisma.tripCrewMember.create({
      data: { tripCrewId, travelerId: finalTravelerId },
    })

    revalidatePath('/tripcrews')
    revalidatePath(`/tripcrews/${tripCrewId}`)
    return { success: true, tripCrewId, id: tripCrewId }
  } catch (error: any) {
    console.error('Join TripCrew error:', error)
    return { success: false, error: error.message || 'Failed to join TripCrew' }
  }
}

/**
 * Generate invite link for TripCrew (GoFast-style: prefer handle URL)
 */
export async function generateInviteLink(tripCrewId: string, travelerId: string) {
  try {
    const isAdmin = await prisma.tripCrewRole.findFirst({
      where: { tripCrewId, travelerId, role: 'admin' },
    })
    if (!isAdmin) throw new Error('Only admins can generate invite links')

    const tripCrew = await prisma.tripCrew.findUnique({
      where: { id: tripCrewId },
      select: { handle: true, joinCode: true },
    })
    if (!tripCrew) throw new Error('TripCrew not found')

    // GoFast-style: invite URL by handle (slug); fallback to join code for legacy
    const slug = tripCrew.handle || tripCrew.joinCode
    const inviteUrl = appConfig.getInviteUrl(slug)

    // Ensure JoinCode registry exists for code-based fallback when using code URL
    if (!tripCrew.handle) {
      const existing = await prisma.joinCode.findFirst({
        where: { tripCrewId, isActive: true },
      })
      if (!existing) {
        await prisma.joinCode.create({
          data: {
            code: tripCrew.joinCode.toUpperCase(),
            tripCrewId,
            isActive: true,
          },
        })
      }
    }

    return { success: true, inviteUrl, inviteCode: tripCrew.joinCode }
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

