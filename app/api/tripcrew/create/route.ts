import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { name, description, travelerId } = await request.json()

    if (!name || !travelerId) {
      return NextResponse.json(
        { error: 'Name and travelerId are required' },
        { status: 400 }
      )
    }

    // Create TripCrew
    const tripCrew = await prisma.tripCrew.create({
      data: {
        name,
        description: description || null,
        // Create membership for creator
        memberships: {
          create: {
            travelerId,
          },
        },
        // Create admin role for creator
        roles: {
          create: {
            travelerId,
            role: 'admin',
          },
        },
      },
      include: {
        trips: true,
        memberships: true,
        roles: true,
      },
    })

    return NextResponse.json({
      success: true,
      tripCrew,
    })
  } catch (error) {
    console.error('Create TripCrew error:', error)
    return NextResponse.json(
      { error: 'Failed to create TripCrew' },
      { status: 500 }
    )
  }
}


