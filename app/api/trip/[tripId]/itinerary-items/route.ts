import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TripDayExperienceStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * List all TripDayExperience rows for a trip (via trip days).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params

    const experiences = await prisma.tripDayExperience.findMany({
      where: { tripDay: { tripId } },
      orderBy: [{ tripDay: { dayNumber: 'asc' } }, { orderIndex: 'asc' }],
      include: {
        tripDay: true,
        dining: true,
        attraction: true,
        concert: true,
        hike: true,
        sport: true,
        adventure: true,
        cruise: true,
      },
    })

    return NextResponse.json(experiences)
  } catch (error) {
    console.error('Trip day experiences list error:', error)
    return NextResponse.json({ error: 'Failed to list experiences' }, { status: 500 })
  }
}

/**
 * Add an experience to a trip day. Body: { title?, date?, hikeId?, diningId?, attractionId?, concertId?, cruiseId?, sportId?, adventureId?, notes? }
 * Resolves trip day by `date` (calendar day) or defaults to day 1.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params
    const body = await request.json()
    const {
      title,
      date,
      diningId,
      attractionId,
      concertId,
      hikeId,
      cruiseId,
      sportId,
      adventureId,
      notes,
    } = body as {
      title?: string
      date?: string
      diningId?: string
      attractionId?: string
      concertId?: string
      hikeId?: string
      cruiseId?: string
      sportId?: string
      adventureId?: string
      notes?: string
    }

    const trip = await prisma.trip.findUnique({ where: { id: tripId } })
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    if (
      !hikeId &&
      !diningId &&
      !attractionId &&
      !concertId &&
      !cruiseId &&
      !sportId &&
      !adventureId
    ) {
      return NextResponse.json(
        {
          error:
            'At least one of hikeId, diningId, attractionId, concertId, cruiseId, sportId, adventureId is required',
        },
        { status: 400 }
      )
    }

    let tripDay = null as Awaited<ReturnType<typeof prisma.tripDay.findFirst>>
    if (date) {
      const d = startOfLocalDay(new Date(date))
      tripDay = await prisma.tripDay.findFirst({
        where: {
          tripId,
          date: d,
        },
      })
    }
    if (!tripDay) {
      tripDay = await prisma.tripDay.findFirst({
        where: { tripId, dayNumber: 1 },
      })
    }
    if (!tripDay) {
      return NextResponse.json(
        { error: 'No trip day found; ensure trip has seeded days' },
        { status: 400 }
      )
    }

    const maxOrder = await prisma.tripDayExperience.aggregate({
      where: { tripDayId: tripDay.id },
      _max: { orderIndex: true },
    })
    const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1

    const item = await prisma.tripDayExperience.create({
      data: {
        tripDayId: tripDay.id,
        orderIndex,
        hikeId: hikeId || null,
        diningId: diningId || null,
        attractionId: attractionId || null,
        concertId: concertId || null,
        cruiseId: cruiseId || null,
        sportId: sportId || null,
        adventureId: adventureId || null,
        notes: notes?.trim() || title?.trim() || null,
        status: TripDayExperienceStatus.PLANNED,
      },
      include: {
        tripDay: true,
        dining: true,
        attraction: true,
        concert: true,
        hike: true,
        sport: true,
        adventure: true,
        cruise: true,
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Trip day experience create error:', error)
    return NextResponse.json({ error: 'Failed to create experience' }, { status: 500 })
  }
}
