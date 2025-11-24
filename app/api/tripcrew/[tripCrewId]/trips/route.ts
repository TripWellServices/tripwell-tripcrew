import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { tripCrewId: string } }
) {
  try {
    const { name, destination, startDate, endDate, coverImage } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Trip name is required' },
        { status: 400 }
      )
    }

    // Verify TripCrew exists
    const tripCrew = await prisma.tripCrew.findUnique({
      where: { id: params.tripCrewId },
    })

    if (!tripCrew) {
      return NextResponse.json(
        { error: 'TripCrew not found' },
        { status: 404 }
      )
    }

    const trip = await prisma.trip.create({
      data: {
        name,
        destination: destination || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        coverImage: coverImage || null,
        tripCrewId: params.tripCrewId,
      },
    })

    return NextResponse.json({
      success: true,
      trip,
    })
  } catch (error) {
    console.error('Create trip error:', error)
    return NextResponse.json(
      { error: 'Failed to create trip' },
      { status: 500 }
    )
  }
}

