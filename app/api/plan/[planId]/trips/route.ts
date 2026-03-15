import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TripStatus } from '@prisma/client'
import { ItineraryItemStatus, ItineraryItemType } from '@prisma/client'
import { computeTripMetadata } from '@/lib/trip/computeTripMetadata'

export const dynamic = 'force-dynamic'

type AnchorType = 'concert' | 'hike' | 'dining' | 'attraction'

/**
 * POST /api/plan/[planId]/trips
 * Anchor fork: create a Trip under the Plan and seed the first ItineraryItem from a first-class object.
 * Body: {
 *   tripName?, purpose?, startDate?, endDate?, tripScope?, crewId?,
 *   concertId? | hikeId? | diningId? | attractionId?  // one required for anchor
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const body = await request.json().catch(() => ({}))
    const {
      tripName,
      purpose,
      startDate: startDateRaw,
      endDate: endDateRaw,
      tripScope,
      crewId: bodyCrewId,
      concertId,
      hikeId,
      diningId,
      attractionId,
      suggestedById,
    } = body

    const plan = await prisma.plan.findUnique({ where: { id: planId }, include: { tripCrew: true } })
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Resolve anchor: exactly one of concert/hike/dining/attraction
    const anchorId = concertId || hikeId || diningId || attractionId
    let anchorType: AnchorType | null = null
    if (concertId) anchorType = 'concert'
    else if (hikeId) anchorType = 'hike'
    else if (diningId) anchorType = 'dining'
    else if (attractionId) anchorType = 'attraction'

    let anchorTitle = tripName?.trim() || 'Trip'

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

    const start = startDateRaw ? new Date(startDateRaw) : new Date()
    const end = endDateRaw ? new Date(endDateRaw) : (() => {
      const e = new Date(start)
      e.setDate(e.getDate() + 7)
      return e
    })()
    const { daysTotal, dateRange, season } = computeTripMetadata(start, end)

    const crewId = bodyCrewId ?? plan.tripCrewId ?? null

    const trip = await prisma.trip.create({
      data: {
        planId,
        crewId,
        tripScope: tripScope ?? null,
        tripName: anchorTitle,
        purpose: (purpose?.trim() || 'Built around ' + anchorTitle).trim(),
        status: TripStatus.PLANNED,
        startDate: start,
        endDate: end,
        daysTotal,
        dateRange,
        season,
      },
    })

    if (anchorType && anchorId) {
      const itineraryType = anchorType as ItineraryItemType
      await prisma.itineraryItem.create({
        data: {
          tripId: trip.id,
          title: anchorTitle,
          status: ItineraryItemStatus.CONSIDERING,
          type: itineraryType,
          concertId: concertId || null,
          hikeId: hikeId || null,
          diningId: diningId || null,
          attractionId: attractionId || null,
          suggestedById: suggestedById || null,
        },
      })
    }

    const created = await prisma.trip.findUnique({
      where: { id: trip.id },
      include: {
        itineraryItems: {
          include: { concert: true, hike: true, dining: true, attraction: true },
        },
      },
    })

    return NextResponse.json({ trip: created }, { status: 201 })
  } catch (error) {
    console.error('Plan trips create error:', error)
    return NextResponse.json(
      { error: 'Failed to create trip from plan' },
      { status: 500 }
    )
  }
}
