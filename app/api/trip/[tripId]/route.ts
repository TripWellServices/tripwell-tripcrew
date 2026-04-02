import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTripAccess } from '@/lib/trip/assertTripAccess'

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
 * PATCH: assign trip to crew or clear. traveler must own trip or belong to crew.
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

    const access = await getTripAccess(tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json(
        { error: access.message },
        { status: access.status }
      )
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
