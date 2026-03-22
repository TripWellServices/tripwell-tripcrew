import { NextRequest, NextResponse } from 'next/server'
import { PlanType, TripStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { computeTripMetadata } from '@/lib/trip/computeTripMetadata'

export const dynamic = 'force-dynamic'

const PERSONAL_PLANNING_NAME = 'Personal planning'

async function getOrCreatePersonalPlanningPlan(travelerId: string) {
  let plan = await prisma.plan.findFirst({
    where: {
      travelerId,
      tripCrewId: null,
      type: PlanType.TRIP,
      name: PERSONAL_PLANNING_NAME,
    },
  })
  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        travelerId,
        name: PERSONAL_PLANNING_NAME,
        tripCrewId: null,
        type: PlanType.TRIP,
      },
    })
  }
  return plan
}

/**
 * GET /api/traveler/trips?travelerId=
 * - Default: personal trips (no crew) under “Personal planning” plan.
 * - scope=all: all trips the traveler can see (own plans + crews they belong to), ordered by startDate.
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

      const orFilters: Array<{ plan: { travelerId: string } } | { crewId: { in: string[] } }> = [
        { plan: { travelerId } },
      ]
      if (crewIds.length > 0) {
        orFilters.push({ crewId: { in: crewIds } })
      }

      const trips = await prisma.trip.findMany({
        where: { OR: orFilters },
        orderBy: { startDate: 'asc' },
        include: {
          crew: { select: { id: true, name: true } },
          plan: { select: { id: true, name: true, tripCrewId: true } },
          _count: {
            select: { destinations: true, itineraryItems: true },
          },
        },
      })

      return NextResponse.json(trips)
    }

    const plans = await prisma.plan.findMany({
      where: {
        travelerId,
        tripCrewId: null,
        type: PlanType.TRIP,
        name: PERSONAL_PLANNING_NAME,
      },
      select: { id: true },
    })
    const planIds = plans.map((p) => p.id)
    if (planIds.length === 0) {
      return NextResponse.json([])
    }

    const trips = await prisma.trip.findMany({
      where: { crewId: null, planId: { in: planIds } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { destinations: true, itineraryItems: true },
        },
      },
    })
    return NextResponse.json(trips)
  } catch (error) {
    console.error('Traveler trips list error:', error)
    return NextResponse.json({ error: 'Failed to list trips' }, { status: 500 })
  }
}

/**
 * POST /api/traveler/trips
 * Body matches crew trips: createPlanned, tripName?, purpose?, travelerId, startDate?, endDate?
 * Creates Trip with crewId null, linked to Personal planning plan.
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
    } = body as {
      createPlanned?: boolean
      tripName?: string
      purpose?: string
      travelerId?: string
      startDate?: string
      endDate?: string
    }

    if (!createPlanned) {
      return NextResponse.json(
        { error: 'Use createPlanned: true for planning wizard trips.' },
        { status: 400 }
      )
    }
    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const traveler = await prisma.traveler.findUnique({ where: { id: travelerId } })
    if (!traveler) {
      return NextResponse.json({ error: 'Traveler not found' }, { status: 404 })
    }

    const plan = await getOrCreatePersonalPlanningPlan(travelerId)

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
    const { daysTotal, dateRange, season } = computeTripMetadata(start, end)

    const trip = await prisma.trip.create({
      data: {
        crewId: null,
        planId: plan.id,
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
  } catch (error) {
    console.error('Traveler trip create error:', error)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}
