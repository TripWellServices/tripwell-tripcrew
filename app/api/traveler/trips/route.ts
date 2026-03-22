import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  computeTripMetadata,
  tripDateRangeLabel,
  tripDisplayTitle,
} from '@/lib/trip/computeTripMetadata'
import { seedTripDays } from '@/lib/trip/seedTripDays'
import { TripType } from '@prisma/client'

export const dynamic = 'force-dynamic'

type AnchorType = 'concert' | 'hike' | 'dining' | 'attraction'

/**
 * GET /api/traveler/trips?travelerId=
 * - Default: trips owned by traveler (travelerId) with no crew.
 * - scope=all: trips where traveler owns OR is member of trip's crew.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const travelerId = url.searchParams.get('travelerId')
    const scope = url.searchParams.get('scope')
    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const traveler = await prisma.traveler.findUnique({ where: { id: travelerId } })
    if (!traveler) {
      return NextResponse.json({ error: 'Traveler not found' }, { status: 404 })
    }

    if (scope === 'all') {
      const memberships = await prisma.tripCrewMember.findMany({
        where: { travelerId },
        select: { tripCrewId: true },
      })
      const crewIds = memberships.map((m) => m.tripCrewId)

      const orFilters: Array<{ travelerId: string } | { crewId: { in: string[] } }> = [
        { travelerId },
      ]
      if (crewIds.length > 0) {
        orFilters.push({ crewId: { in: crewIds } })
      }

      const trips = await prisma.trip.findMany({
        where: { OR: orFilters },
        orderBy: { startDate: 'asc' },
        include: {
          crew: { select: { id: true, name: true } },
          _count: {
            select: { destinations: true, tripDays: true },
          },
        },
      })

      return NextResponse.json(
        trips.map((t) => ({
          ...t,
          tripName: tripDisplayTitle(t.purpose),
          dateRange: tripDateRangeLabel(t.startDate, t.endDate),
        }))
      )
    }

    const trips = await prisma.trip.findMany({
      where: { crewId: null, travelerId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { destinations: true, tripDays: true },
        },
      },
    })
    return NextResponse.json(
      trips.map((t) => ({
        ...t,
        tripName: tripDisplayTitle(t.purpose),
        dateRange: tripDateRangeLabel(t.startDate, t.endDate),
      }))
    )
  } catch (error) {
    console.error('Traveler trips list error:', error)
    return NextResponse.json({ error: 'Failed to list trips' }, { status: 500 })
  }
}

/**
 * POST /api/traveler/trips
 * Body:
 * - createPlanned: true — minimal planning trip (optional dates default +7d)
 * - travelerId (required)
 * - tripName?, purpose?, startDate?, endDate?
 * - OR anchor fork: concertId | hikeId | diningId | attractionId (exactly one) + optional crewId
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      createPlanned,
      tripName,
      purpose,
      travelerId,
      startDate: startDateRaw,
      endDate: endDateRaw,
      crewId: bodyCrewId,
      concertId,
      hikeId,
      diningId,
      attractionId,
    } = body as {
      createPlanned?: boolean
      tripName?: string
      purpose?: string
      travelerId?: string
      startDate?: string
      endDate?: string
      crewId?: string | null
      concertId?: string
      hikeId?: string
      diningId?: string
      attractionId?: string
    }

    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const traveler = await prisma.traveler.findUnique({ where: { id: travelerId } })
    if (!traveler) {
      return NextResponse.json({ error: 'Traveler not found' }, { status: 404 })
    }

    const anchorId = concertId || hikeId || diningId || attractionId
    let anchorType: AnchorType | null = null
    if (concertId) anchorType = 'concert'
    else if (hikeId) anchorType = 'hike'
    else if (diningId) anchorType = 'dining'
    else if (attractionId) anchorType = 'attraction'

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

    let anchorTitle = (tripName?.trim() || 'Trip') as string
    if (anchorType && anchorId) {
      if (anchorType === 'concert') {
        const c = await prisma.concert.findUnique({ where: { id: anchorId } })
        if (c) anchorTitle = c.name
      } else if (anchorType === 'hike') {
        const h = await prisma.hike.findUnique({ where: { id: anchorId } })
        if (h) anchorTitle = h.name
      } else if (anchorType === 'dining') {
        const d = await prisma.dining.findUnique({ where: { id: anchorId } })
        if (d) anchorTitle = d.title
      } else if (anchorType === 'attraction') {
        const a = await prisma.attraction.findUnique({ where: { id: anchorId } })
        if (a) anchorTitle = a.title
      }
    }

    const tn = tripName?.trim()
    const pr = purpose?.trim()
    let purposeFinal = ''
    if (tn && pr) purposeFinal = `${tn}. ${pr}`
    else purposeFinal = pr || tn || ''
    if (!purposeFinal) {
      purposeFinal = createPlanned ? 'Planning our trip' : `Built around ${anchorTitle}`
    }

    const crewId = bodyCrewId ?? null
    if (crewId) {
      const m = await prisma.tripCrewMember.findFirst({
        where: { tripCrewId: crewId, travelerId },
      })
      if (!m) {
        return NextResponse.json({ error: 'Not a member of this TripCrew' }, { status: 403 })
      }
    }

    const trip = await prisma.$transaction(async (tx) => {
      const t = await tx.trip.create({
        data: {
          crewId,
          travelerId,
          purpose: purposeFinal,
          startDate: start,
          endDate: end,
          daysTotal,
          season,
          tripType,
          startingLocation: traveler.homeAddress,
        },
      })
      await seedTripDays(tx, {
        tripId: t.id,
        startDate: start,
        endDate: end,
        dayStartTime: traveler.defaultDayStartTime,
        dayEndTime: traveler.defaultDayEndTime,
      })

      if (anchorType && anchorId) {
        const firstDay = await tx.tripDay.findFirst({
          where: { tripId: t.id, dayNumber: 1 },
        })
        if (firstDay) {
          await tx.tripDayExperience.create({
            data: {
              tripDayId: firstDay.id,
              orderIndex: 0,
              concertId: concertId || null,
              hikeId: hikeId || null,
              diningId: diningId || null,
              attractionId: attractionId || null,
            },
          })
        }
      }
      return t
    })

    const created = await prisma.trip.findUnique({
      where: { id: trip.id },
      include: {
        tripDays: {
          orderBy: { dayNumber: 'asc' },
          include: {
            experiences: {
              include: { concert: true, hike: true, dining: true, attraction: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ trip: created, id: trip.id }, { status: 201 })
  } catch (error) {
    console.error('Traveler trip create error:', error)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}
