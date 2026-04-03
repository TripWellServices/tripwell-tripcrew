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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  try {
    const { memoryId } = await params
    const travelerId = request.nextUrl.searchParams.get('travelerId')?.trim()
    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const memory = await prisma.tripMemory.findFirst({
      where: { id: memoryId, authorTravelerId: travelerId },
      include: tripMemoryApiInclude,
    })

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    return NextResponse.json(memory)
  } catch (error) {
    console.error('Traveler memory GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch memory' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  try {
    const { memoryId } = await params
    const body = await request.json().catch(() => ({}))
    const {
      travelerId,
      body: reflectionBody,
      tripId: nextTripId,
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

    const existing = await prisma.tripMemory.findFirst({
      where: { id: memoryId, authorTravelerId: travelerId },
      include: { photos: { select: { id: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    let newTripId: string | null | undefined = undefined
    if (nextTripId !== undefined) {
      const raw = nextTripId === '' || nextTripId === null ? null : String(nextTripId).trim()
      if (raw) {
        const access = await getTripAccess(raw, travelerId)
        if (!access.ok) {
          return NextResponse.json({ error: access.message }, { status: access.status })
        }
      }
      newTripId = raw
    }

    let nextTripDayId: string | null | undefined = undefined
    if (tripDayId !== undefined) {
      const effectiveTrip = newTripId !== undefined ? newTripId : existing.tripId
      if (!effectiveTrip && tripDayId && tripDayId !== '') {
        return NextResponse.json(
          { error: 'tripDayId requires a linked trip' },
          { status: 400 }
        )
      }
      if (tripDayId === '' || tripDayId === null) {
        nextTripDayId = null
      } else if (effectiveTrip) {
        const day = await prisma.tripDay.findFirst({
          where: { id: tripDayId, tripId: effectiveTrip },
        })
        if (!day) {
          return NextResponse.json({ error: 'Invalid tripDayId for this trip' }, { status: 400 })
        }
        nextTripDayId = tripDayId
      }
    }

    if (newTripId === null) {
      nextTripDayId = null
    }

    const nextFreestyleTitle =
      freestyleTitle !== undefined
        ? typeof freestyleTitle === 'string'
          ? freestyleTitle.trim()
          : null
        : undefined

    const effectiveTripAfter =
      newTripId !== undefined ? newTripId : existing.tripId

    if (!effectiveTripAfter) {
      const titleForCheck =
        nextFreestyleTitle !== undefined
          ? nextFreestyleTitle
          : existing.freestyleTitle?.trim() ?? ''
      if (!titleForCheck) {
        return NextResponse.json(
          { error: 'freestyleTitle is required for standalone memories' },
          { status: 400 }
        )
      }
    }

    let nextBody =
      reflectionBody !== undefined ? String(reflectionBody) : existing.body

    if (reflectionBody !== undefined) {
      const photoCount = existing.photos.length
      if (!nextBody.trim() && photoCount === 0) {
        return NextResponse.json(
          { error: 'Reflection cannot be empty until you add at least one photo' },
          { status: 400 }
        )
      }
    }

    const data: Record<string, unknown> = {}
    if (reflectionBody !== undefined) data.body = nextBody
    if (newTripId !== undefined) {
      data.tripId = newTripId
      if (newTripId) {
        data.freestyleTitle = null
        data.freestyleCity = null
        data.freestyleState = null
        data.freestyleCountry = null
        data.freestyleStartDate = null
        data.freestyleEndDate = null
      }
    }
    if (nextTripDayId !== undefined) data.tripDayId = nextTripDayId
    if (freestyleTitle !== undefined && !effectiveTripAfter)
      data.freestyleTitle = nextFreestyleTitle || null
    if (freestyleCity !== undefined && !effectiveTripAfter)
      data.freestyleCity = freestyleCity?.trim() || null
    if (freestyleState !== undefined && !effectiveTripAfter)
      data.freestyleState = freestyleState?.trim() || null
    if (freestyleCountry !== undefined && !effectiveTripAfter)
      data.freestyleCountry = freestyleCountry?.trim() || null
    if (freestyleStartDate !== undefined && !effectiveTripAfter)
      data.freestyleStartDate = parseOptDate(freestyleStartDate)
    if (freestyleEndDate !== undefined && !effectiveTripAfter)
      data.freestyleEndDate = parseOptDate(freestyleEndDate)

    const memory = await prisma.tripMemory.update({
      where: { id: memoryId },
      data: data as object,
      include: tripMemoryApiInclude,
    })

    return NextResponse.json(memory)
  } catch (error) {
    console.error('Traveler memory PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  try {
    const { memoryId } = await params
    const travelerId = request.nextUrl.searchParams.get('travelerId')?.trim()
    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const existing = await prisma.tripMemory.findFirst({
      where: { id: memoryId, authorTravelerId: travelerId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    await prisma.tripMemory.delete({ where: { id: memoryId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Traveler memory DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
  }
}
