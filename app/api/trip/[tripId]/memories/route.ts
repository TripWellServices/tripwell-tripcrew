import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import { getSuggestedCrewEmails } from '@/lib/trip/suggestedCrewEmails'

export const dynamic = 'force-dynamic'

const memoryInclude = {
  author: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  photos: { orderBy: { sortOrder: 'asc' as const } },
  tripDay: { select: { id: true, dayNumber: true, date: true } },
} as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params
    const travelerId = request.nextUrl.searchParams.get('travelerId')?.trim()
    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const [memories, suggestedRecipientEmails] = await Promise.all([
      prisma.tripMemory.findMany({
        where: { tripId },
        orderBy: { createdAt: 'desc' },
        include: memoryInclude,
      }),
      getSuggestedCrewEmails(tripId, travelerId),
    ])

    return NextResponse.json({ memories, suggestedRecipientEmails })
  } catch (error) {
    console.error('Memories GET error:', error)
    return NextResponse.json({ error: 'Failed to list memories' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params
    const body = await request.json().catch(() => ({}))
    const {
      travelerId,
      body: reflectionBody,
      tripDayId,
    } = body as {
      travelerId?: string
      body?: string
      tripDayId?: string | null
    }

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const text = typeof reflectionBody === 'string' ? reflectionBody : ''

    if (tripDayId) {
      const day = await prisma.tripDay.findFirst({
        where: { id: tripDayId, tripId },
      })
      if (!day) {
        return NextResponse.json({ error: 'Invalid tripDayId for this trip' }, { status: 400 })
      }
    }

    const memory = await prisma.tripMemory.create({
      data: {
        tripId,
        authorTravelerId: travelerId,
        tripDayId: tripDayId || null,
        body: text,
      },
      include: memoryInclude,
    })

    return NextResponse.json(memory)
  } catch (error) {
    console.error('Memories POST error:', error)
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 })
  }
}
