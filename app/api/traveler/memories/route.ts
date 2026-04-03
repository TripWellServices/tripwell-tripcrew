import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import { tripMemoryApiInclude } from '@/lib/trip/memoryIncludePrisma'

export const dynamic = 'force-dynamic'

function parseOptDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v !== 'string') return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET(request: NextRequest) {
  try {
    const travelerId = request.nextUrl.searchParams.get('travelerId')?.trim()
    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const t = await prisma.traveler.findUnique({ where: { id: travelerId } })
    if (!t) {
      return NextResponse.json({ error: 'Traveler not found' }, { status: 404 })
    }

    const memories = await prisma.tripMemory.findMany({
      where: { authorTravelerId: travelerId },
      orderBy: { createdAt: 'desc' },
      include: tripMemoryApiInclude,
    })

    return NextResponse.json({ memories })
  } catch (error) {
    console.error('Traveler memories GET error:', error)
    return NextResponse.json({ error: 'Failed to list memories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      travelerId,
      body: reflectionBody,
      tripId,
      tripDayId,
      freestyleTitle,
      freestyleCity,
      freestyleState,
      freestyleCountry,
      freestyleStartDate,
      freestyleEndDate,
    } = body as {
      travelerId?: string
      body?: string
      tripId?: string | null
      tripDayId?: string | null
      freestyleTitle?: string | null
      freestyleCity?: string | null
      freestyleState?: string | null
      freestyleCountry?: string | null
      freestyleStartDate?: string | null
      freestyleEndDate?: string | null
    }

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const text = typeof reflectionBody === 'string' ? reflectionBody : ''

    const tid = tripId?.trim() || null

    if (tid) {
      const access = await getTripAccess(tid, travelerId)
      if (!access.ok) {
        return NextResponse.json({ error: access.message }, { status: access.status })
      }
      if (tripDayId) {
        const day = await prisma.tripDay.findFirst({
          where: { id: tripDayId, tripId: tid },
        })
        if (!day) {
          return NextResponse.json({ error: 'Invalid tripDayId for this trip' }, { status: 400 })
        }
      }

      const memory = await prisma.tripMemory.create({
        data: {
          tripId: tid,
          authorTravelerId: travelerId,
          tripDayId: tripDayId || null,
          body: text,
          freestyleTitle: null,
          freestyleCity: null,
          freestyleState: null,
          freestyleCountry: null,
          freestyleStartDate: null,
          freestyleEndDate: null,
        },
        include: tripMemoryApiInclude,
      })
      return NextResponse.json(memory)
    }

    const title = typeof freestyleTitle === 'string' ? freestyleTitle.trim() : ''
    if (!title) {
      return NextResponse.json(
        { error: 'freestyleTitle is required when not linking to a trip' },
        { status: 400 }
      )
    }

    const memory = await prisma.tripMemory.create({
      data: {
        tripId: null,
        authorTravelerId: travelerId,
        tripDayId: null,
        body: text,
        freestyleTitle: title,
        freestyleCity: freestyleCity?.trim() || null,
        freestyleState: freestyleState?.trim() || null,
        freestyleCountry: freestyleCountry?.trim() || null,
        freestyleStartDate: parseOptDate(freestyleStartDate),
        freestyleEndDate: parseOptDate(freestyleEndDate),
      },
      include: tripMemoryApiInclude,
    })

    return NextResponse.json(memory)
  } catch (error) {
    console.error('Traveler memories POST error:', error)
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 })
  }
}
