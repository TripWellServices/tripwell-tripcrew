import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { name, description, ownerId } = await request.json()

    if (!name || !ownerId) {
      return NextResponse.json(
        { error: 'Name and ownerId are required' },
        { status: 400 }
      )
    }

    const tripCrew = await prisma.tripCrew.create({
      data: {
        name,
        description: description || null,
        ownerId,
      },
      include: {
        trips: true,
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

