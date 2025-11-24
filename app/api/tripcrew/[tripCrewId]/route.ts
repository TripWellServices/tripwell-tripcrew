import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { tripCrewId: string } }
) {
  try {
    const tripCrew = await prisma.tripCrew.findUnique({
      where: { id: params.tripCrewId },
      include: {
        trips: {
          orderBy: { createdAt: 'desc' },
        },
        owner: true,
      },
    })

    if (!tripCrew) {
      return NextResponse.json(
        { error: 'TripCrew not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      tripCrew,
    })
  } catch (error) {
    console.error('Get TripCrew error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch TripCrew' },
      { status: 500 }
    )
  }
}

