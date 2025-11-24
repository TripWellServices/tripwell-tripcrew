import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { firebaseId, email, name, picture } = await request.json()

    if (!firebaseId) {
      return NextResponse.json(
        { error: 'Firebase ID required' },
        { status: 400 }
      )
    }

    // Find or create Traveler
    let traveler = await prisma.traveler.findUnique({
      where: { firebaseId },
      include: {
        tripCrewsOwned: {
          orderBy: { createdAt: 'desc' },
          include: {
            trips: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    })

    if (!traveler) {
      // Create new Traveler
      const nameParts = name?.split(' ') || []
      traveler = await prisma.traveler.create({
        data: {
          firebaseId,
          email: email || null,
          firstName: nameParts[0] || null,
          lastName: nameParts.slice(1).join(' ') || null,
          photoUrl: picture || null,
        },
        include: {
          tripCrewsOwned: {
            orderBy: { createdAt: 'desc' },
            include: {
              trips: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      })
    } else {
      // Update existing Traveler with latest Firebase data
      const nameParts = name?.split(' ') || []
      traveler = await prisma.traveler.update({
        where: { id: traveler.id },
        data: {
          email: email || traveler.email,
          firstName: nameParts[0] || traveler.firstName,
          lastName: nameParts.slice(1).join(' ') || traveler.lastName,
          photoUrl: picture || traveler.photoUrl,
        },
        include: {
          tripCrewsOwned: {
            orderBy: { createdAt: 'desc' },
            include: {
              trips: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      traveler,
    })
  } catch (error) {
    console.error('Hydrate error:', error)
    return NextResponse.json(
      { error: 'Failed to hydrate user' },
      { status: 500 }
    )
  }
}

