import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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
        itineraryItems: {
          orderBy: [{ date: 'asc' }, { day: 'asc' }, { createdAt: 'asc' }],
          include: {
            destination: { include: { city: true } },
            lodging: true,
            dining: true,
            attraction: true,
            stuffToDo: true,
            concert: true,
            suggestedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoURL: true,
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
    return NextResponse.json(
      { error: 'Failed to fetch trip' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/trip/[tripId]
 * Body: { travelerId: string, crewId: string | null }
 * Assign trip to a TripCrew (or clear to personal) when the traveler is allowed to edit the trip.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params
    const body = await request.json().catch(() => ({}))
    const { travelerId, crewId } = body as { travelerId?: string; crewId?: string | null }

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        plan: { select: { travelerId: true } },
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const ownsViaPlan = trip.plan?.travelerId === travelerId
    let memberOfTripCrew = false
    if (trip.crewId) {
      const m = await prisma.tripCrewMember.findFirst({
        where: { tripCrewId: trip.crewId, travelerId },
      })
      memberOfTripCrew = Boolean(m)
    }

    if (!ownsViaPlan && !memberOfTripCrew) {
      return NextResponse.json({ error: 'Not allowed to update this trip' }, { status: 403 })
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

