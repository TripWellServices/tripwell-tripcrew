import { NextRequest, NextResponse } from 'next/server'
import { TravelerFindOrCreateService } from '@/lib/services/TravelerFindOrCreateService'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/traveler/migrate
 * 
 * Migrate/upsert Traveler from email or firebaseId
 * Useful if you were in MongoDB TripWell before or GoFast Athlete
 * 
 * Request body:
 * {
 *   email?: string (optional - will find by email if firebaseId not provided)
 *   firebaseId?: string (optional - will find by firebaseId if provided)
 *   firstName?: string (optional - will update if provided)
 *   lastName?: string (optional - will update if provided)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, firebaseId, firstName, lastName } = body

    if (!email && !firebaseId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either email or firebaseId is required',
        },
        { status: 400 }
      )
    }

    console.log('🔄 TRAVELER MIGRATE: email:', email, 'firebaseId:', firebaseId)

    let traveler

    if (firebaseId) {
      // Find or create by firebaseId (standard flow)
      traveler = await TravelerFindOrCreateService.findOrCreate({
        firebaseId,
        email,
        displayName: firstName && lastName ? `${firstName} ${lastName}` : firstName || undefined,
      })
    } else if (email) {
      // Find existing by email, or create new
      traveler = await prisma.traveler.findUnique({
        where: { email },
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

      if (!traveler) {
        // Create new traveler with email (firebaseId will be null until they sign in)
        const enterpriseId = 'tripwell-enterprises-master-container'
        let enterprise = await prisma.tripWellEnterprise.findUnique({
          where: { id: enterpriseId },
        })

        if (!enterprise) {
          enterprise = await prisma.tripWellEnterprise.create({
            data: {
              id: enterpriseId,
              name: 'TripWell Enterprises',
              description: 'Master container for all TripWell travelers',
            },
          })
        }

        traveler = await prisma.traveler.create({
          data: {
            email,
            firstName: firstName || null,
            lastName: lastName || null,
            firebaseId: null, // Will be set when they sign in with Firebase
            tripWellEnterpriseId: enterpriseId,
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
        console.log('✅ TRAVELER MIGRATE: Created new traveler by email:', email)
      } else {
        // Update existing traveler if firstName/lastName provided
        if (firstName || lastName) {
          traveler = await prisma.traveler.update({
            where: { id: traveler.id },
            data: {
              firstName: firstName || traveler.firstName,
              lastName: lastName || traveler.lastName,
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
          console.log('✅ TRAVELER MIGRATE: Updated existing traveler:', traveler.id)
        } else {
          console.log('✅ TRAVELER MIGRATE: Found existing traveler:', traveler.id)
        }
      }
    }

    if (!traveler) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create or find traveler',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Traveler migrated/upserted successfully',
      traveler: {
        id: traveler.id,
        firebaseId: traveler.firebaseId,
        email: traveler.email,
        firstName: traveler.firstName,
        lastName: traveler.lastName,
        tripWellEnterpriseId: traveler.tripWellEnterpriseId,
      },
    })
  } catch (error: any) {
    console.error('❌ TRAVELER MIGRATE error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to migrate traveler',
      },
      { status: 500 }
    )
  }
}

