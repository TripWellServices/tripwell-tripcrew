import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeTripMetadata } from '@/lib/trip/computeTripMetadata'
import { seedTripDays } from '@/lib/trip/seedTripDays'
import { TripType } from '@prisma/client'

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
          select: { destinations: true, tripDays: true },
        },
      },
    })
    return NextResponse.json(trips)
  } catch (error) {
    console.error('Trips list error:', error)
    return NextResponse.json({ error: 'Failed to list trips' }, { status: 500 })
  }
}

/**
 * Create a trip. Use createPlanned: true for planning wizard (minimal trip + seeded days).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripCrewId: string }> }
) {
  try {
    const { tripCrewId } = await params
    const body = await request.json().catch(() => ({}))
    const {
      createPlanned,
      tripName,
      purpose,
      travelerId,
      startDate: startDateRaw,
      endDate: endDateRaw,
    } = body as {
      createPlanned?: boolean
      tripName?: string
      purpose?: string
      travelerId?: string
      startDate?: string
      endDate?: string
    }

    if (createPlanned) {
      const membership = await prisma.tripCrewMember.findFirst({
        where: { tripCrewId, travelerId: travelerId || '' },
      })
      if (!membership && travelerId) {
        return NextResponse.json({ error: 'Not a member of this TripCrew' }, { status: 403 })
      }
      let start: Date
      let end: Date
      if (startDateRaw && endDateRaw) {
        start = new Date(startDateRaw)
        end = new Date(endDateRaw)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return NextResponse.json({ error: 'Invalid startDate or endDate' }, { status: 400 })
        }
        if (end.getTime() < start.getTime()) {
          return NextResponse.json({ error: 'endDate must be on or after startDate' }, { status: 400 })
        }
      } else if (startDateRaw) {
        start = new Date(startDateRaw)
        if (Number.isNaN(start.getTime())) {
          return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 })
        }
        end = new Date(start)
        end.setDate(end.getDate() + 7)
      } else if (endDateRaw) {
        end = new Date(endDateRaw)
        if (Number.isNaN(end.getTime())) {
          return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 })
        }
        start = new Date(end)
        start.setDate(start.getDate() - 7)
        if (start.getTime() > end.getTime()) {
          start = new Date(end)
        }
      } else {
        start = new Date()
        end = new Date()
        end.setDate(end.getDate() + 7)
      }
      const { daysTotal, season } = computeTripMetadata(start, end)
      const sameCalendarDay =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate()
      const tripType = sameCalendarDay ? TripType.SINGLE_DAY : TripType.MULTI_DAY

      const traveler = travelerId
        ? await prisma.traveler.findUnique({ where: { id: travelerId } })
        : null

      const trip = await prisma.$transaction(async (tx) => {
        const t = await tx.trip.create({
          data: {
            crewId: tripCrewId,
            travelerId: travelerId || null,
            purpose: (purpose || tripName || 'Planning our trip').trim(),
            startDate: start,
            endDate: end,
            daysTotal,
            season,
            tripType,
            startingLocation: traveler?.homeAddress ?? null,
          },
        })
        await seedTripDays(tx, {
          tripId: t.id,
          startDate: start,
          endDate: end,
        })
        return t
      })
      return NextResponse.json({ trip, id: trip.id })
    }

    return NextResponse.json(
      { error: 'Use createPlanned: true or use the Create Trip form.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Create trip error:', error)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}
