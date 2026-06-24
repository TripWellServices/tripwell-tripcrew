import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import { tripPersistedMetadata } from '@/lib/trip/computeTripMetadata'
import { seedTripDays } from '@/lib/trip/seedTripDays'
import { TripType, TransportMode, WhoWith } from '@prisma/client'

export const dynamic = 'force-dynamic'

const WHO_WITH: WhoWith[] = ['SOLO', 'SPOUSE', 'FRIENDS', 'FAMILY', 'OTHER']
const TRANSPORT: TransportMode[] = ['CAR', 'BOAT', 'PLANE']

function normWhoWith(v: unknown): WhoWith | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const u = v.toUpperCase() as WhoWith
  return WHO_WITH.includes(u) ? u : null
}

function normTransportMode(v: unknown): TransportMode | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const u = v.toUpperCase() as TransportMode
  return TRANSPORT.includes(u) ? u : null
}

function parseTripDate(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        destinations: {
          orderBy: { order: 'asc' },
          include: { city: true },
        },
        tripDays: {
          orderBy: { dayNumber: 'asc' },
          include: {
            experiences: {
              orderBy: { orderIndex: 'asc' },
              include: {
                dining: true,
                attraction: true,
                concert: true,
                hike: true,
                sport: true,
                adventure: true,
                cruise: true,
              },
            },
          },
        },
        lodging: true,
        dining: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
        },
        attractions: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
        },
        logistics: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
        },
        packItems: {
          where: { tripId },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    return NextResponse.json(trip)
  } catch (error) {
    console.error('Trip fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 })
  }
}

/**
 * PATCH: assign trip to crew, clear crew, or update core trip fields.
 * Body: { travelerId, crewId?, title?, purpose?, city?, state?, country?, startDate?, endDate?, whoWith?, transportMode?, startingLocation? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params
    const body = await request.json().catch(() => ({}))
    const {
      travelerId,
      crewId,
      title: titleRaw,
      purpose,
      city,
      state,
      country,
      startDate: startDateRaw,
      endDate: endDateRaw,
      whoWith: whoWithRaw,
      transportMode: transportModeRaw,
      startingLocation,
    } = body as {
      travelerId?: string
      crewId?: string | null
      title?: string | null
      purpose?: string | null
      city?: string | null
      state?: string | null
      country?: string | null
      startDate?: string
      endDate?: string
      whoWith?: string | null
      transportMode?: string | null
      startingLocation?: string | null
    }

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json(
        { error: access.message },
        { status: access.status }
      )
    }

    const hasCoreUpdate =
      titleRaw !== undefined ||
      purpose !== undefined ||
      city !== undefined ||
      state !== undefined ||
      country !== undefined ||
      startDateRaw !== undefined ||
      endDateRaw !== undefined ||
      whoWithRaw !== undefined ||
      transportModeRaw !== undefined ||
      startingLocation !== undefined

    if (hasCoreUpdate) {
      const existing = await prisma.trip.findUnique({ where: { id: tripId } })
      if (!existing) {
        return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
      }

      const startDate = startDateRaw !== undefined ? parseTripDate(startDateRaw) : existing.startDate
      const endDate = endDateRaw !== undefined ? parseTripDate(endDateRaw) : existing.endDate
      if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Invalid startDate or endDate' }, { status: 400 })
      }
      if (endDate.getTime() < startDate.getTime()) {
        return NextResponse.json(
          { error: 'endDate must be on or after startDate' },
          { status: 400 }
        )
      }

      const datesChanged =
        startDate.getTime() !== existing.startDate.getTime() ||
        endDate.getTime() !== existing.endDate.getTime()

      const { daysTotal, season } = tripPersistedMetadata(startDate, endDate)
      const sameCalendarDay =
        startDate.getFullYear() === endDate.getFullYear() &&
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getDate() === endDate.getDate()
      const tripType = sameCalendarDay ? TripType.SINGLE_DAY : TripType.MULTI_DAY

      const trip = await prisma.$transaction(async (tx) => {
        const updated = await tx.trip.update({
          where: { id: tripId },
          data: {
            ...(titleRaw !== undefined && { title: titleRaw?.trim() || null }),
            ...(purpose !== undefined && { purpose: purpose?.trim() ?? '' }),
            ...(city !== undefined && { city: city?.trim() || null }),
            ...(state !== undefined && { state: state?.trim() || null }),
            ...(country !== undefined && { country: country?.trim() || null }),
            startDate,
            endDate,
            daysTotal,
            season,
            tripType,
            ...(whoWithRaw !== undefined && { whoWith: normWhoWith(whoWithRaw) }),
            ...(transportModeRaw !== undefined && {
              transportMode: normTransportMode(transportModeRaw),
            }),
            ...(startingLocation !== undefined && {
              startingLocation: startingLocation?.trim() || null,
            }),
          },
        })
        if (datesChanged) {
          await tx.tripDay.deleteMany({ where: { tripId } })
          await seedTripDays(tx, { tripId, startDate, endDate })
        }
        return updated
      })

      return NextResponse.json({ ok: true, trip })
    }

    if (crewId === null || crewId === '') {
      await prisma.trip.update({
        where: { id: tripId },
        data: { crewId: null },
      })
      return NextResponse.json({ ok: true, crewId: null })
    }

    const membership = await prisma.tripCrewMember.findFirst({
      where: { tripCrewId: crewId, travelerId },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of that TripCrew' }, { status: 403 })
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: { crewId },
    })

    return NextResponse.json({ ok: true, crewId })
  } catch (error) {
    console.error('Trip PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 })
  }
}
