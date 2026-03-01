import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TripStatus } from '@prisma/client'
import { computeTripMetadata } from '@/lib/trip/computeTripMetadata'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripCrewId: string }> }
) {
  try {
    const { tripCrewId } = await params
    const trips = await prisma.trip.findMany({
      where: { crewId: tripCrewId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { destinations: true, itineraryItems: true },
        },
      },
    })
    return NextResponse.json(trips)
  } catch (error) {
    console.error('Trips list error:', error)
    return NextResponse.json(
      { error: 'Failed to list trips' },
      { status: 500 }
    )
  }
}

/**
 * Create a trip. Use createPlanned: true for planning wizard (minimal PLANNED trip).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripCrewId: string }> }
) {
  try {
    const { tripCrewId } = await params
    const body = await request.json().catch(() => ({}))
    const { createPlanned, tripName, purpose, travelerId } = body

    if (createPlanned) {
      const membership = await prisma.tripCrewMember.findFirst({
        where: { tripCrewId, travelerId: travelerId || '' },
      })
      if (!membership && travelerId) {
        return NextResponse.json(
          { error: 'Not a member of this TripCrew' },
          { status: 403 }
        )
      }
      const start = new Date()
      const end = new Date()
      end.setDate(end.getDate() + 7)
      const { daysTotal, dateRange, season } = computeTripMetadata(start, end)
      const trip = await prisma.trip.create({
        data: {
          crewId: tripCrewId,
          tripName: (tripName || 'Planning').trim(),
          purpose: (purpose || 'Planning our trip').trim(),
          status: TripStatus.PLANNED,
          startDate: start,
          endDate: end,
          daysTotal,
          dateRange,
          season,
        },
      })
      return NextResponse.json({ trip, id: trip.id })
    }

    return NextResponse.json(
      { error: 'Use createPlanned: true or use the Create Trip form.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Create trip error:', error)
    return NextResponse.json(
      { error: 'Failed to create trip' },
      { status: 500 }
    )
  }
}
