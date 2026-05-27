import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TripDayExperienceStatus } from '@prisma/client'
import { parseFlexibleDateOnly } from '@/lib/trip-plan-dates'

export const dynamic = 'force-dynamic'

type TripDayPick = { id: string; dayNumber: number; date: Date }

function utcDayKey(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function tripDayForDateInput(
  tripDays: TripDayPick[],
  dateRaw: string
): { day: TripDayPick | null; ymd: string | null; invalid: boolean } {
  const ymd = parseFlexibleDateOnly(dateRaw)
  if (!ymd) return { day: null, ymd: null, invalid: true }
  const targetKey = utcDayKey(new Date(`${ymd}T12:00:00.000Z`))
  const day =
    tripDays.find((td) => utcDayKey(new Date(td.date)) === targetKey) ?? null
  return { day, ymd, invalid: false }
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

    const tripDays = await prisma.tripDay.findMany({
      where: { tripId },
      orderBy: { dayNumber: 'asc' },
      select: { id: true, dayNumber: true, date: true },
    })

    let tripDay: TripDayPick | null = null
    if (date) {
      const resolved = tripDayForDateInput(tripDays, date)
      if (resolved.invalid) {
        return NextResponse.json({ error: 'Invalid date for itinerary item' }, { status: 400 })
      }
      if (!resolved.day) {
        return NextResponse.json(
          { error: `No trip day matches ${resolved.ymd}; check your trip dates` },
          { status: 400 }
        )
      }
      tripDay = resolved.day
    } else {
      tripDay = tripDays.find((d) => d.dayNumber === 1) ?? tripDays[0] ?? null
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
