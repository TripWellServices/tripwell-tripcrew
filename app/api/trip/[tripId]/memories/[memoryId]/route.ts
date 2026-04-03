import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import { tripMemoryApiInclude } from '@/lib/trip/memoryIncludePrisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; memoryId: string }> }
) {
  try {
    const { tripId, memoryId } = await params
    const travelerId = request.nextUrl.searchParams.get('travelerId')?.trim()
    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const memory = await prisma.tripMemory.findFirst({
      where: { id: memoryId, tripId },
      include: tripMemoryApiInclude,
    })

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    return NextResponse.json(memory)
  } catch (error) {
    console.error('Memory GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch memory' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; memoryId: string }> }
) {
  try {
    const { tripId, memoryId } = await params
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

    const existing = await prisma.tripMemory.findFirst({
      where: { id: memoryId, tripId },
      include: { photos: { select: { id: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    if (existing.authorTravelerId !== travelerId) {
      return NextResponse.json({ error: 'Only the author can edit this memory' }, { status: 403 })
    }

    let nextBody =
      reflectionBody !== undefined
        ? String(reflectionBody)
        : existing.body

    if (tripDayId !== undefined && tripDayId !== null && tripDayId !== '') {
      const day = await prisma.tripDay.findFirst({
        where: { id: tripDayId, tripId },
      })
      if (!day) {
        return NextResponse.json({ error: 'Invalid tripDayId for this trip' }, { status: 400 })
      }
    }

    if (reflectionBody !== undefined) {
      const photoCount = existing.photos.length
      if (!nextBody.trim() && photoCount === 0) {
        return NextResponse.json(
          { error: 'Reflection cannot be empty until you add at least one photo' },
          { status: 400 }
        )
      }
    }

    const memory = await prisma.tripMemory.update({
      where: { id: memoryId },
      data: {
        ...(reflectionBody !== undefined ? { body: nextBody } : {}),
        ...(tripDayId !== undefined
          ? { tripDayId: tripDayId === '' ? null : tripDayId }
          : {}),
      },
      include: tripMemoryApiInclude,
    })

    return NextResponse.json(memory)
  } catch (error) {
    console.error('Memory PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; memoryId: string }> }
) {
  try {
    const { tripId, memoryId } = await params
    const travelerId = request.nextUrl.searchParams.get('travelerId')?.trim()
    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const existing = await prisma.tripMemory.findFirst({
      where: { id: memoryId, tripId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    if (existing.authorTravelerId !== travelerId) {
      return NextResponse.json({ error: 'Only the author can delete this memory' }, { status: 403 })
    }

    await prisma.tripMemory.delete({ where: { id: memoryId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Memory DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
  }
}
