import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TripDayExperienceStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; itemId: string }> }
) {
  try {
    const { tripId, itemId } = await params
    const body = await request.json()
    const {
      status,
      startTime,
      endTime,
      notes,
      orderIndex,
      hikeId,
      diningId,
      attractionId,
      concertId,
    } = body as {
      status?: TripDayExperienceStatus
      startTime?: string | null
      endTime?: string | null
      notes?: string | null
      orderIndex?: number
      hikeId?: string | null
      diningId?: string | null
      attractionId?: string | null
      concertId?: string | null
    }

    const existing = await prisma.tripDayExperience.findFirst({
      where: { id: itemId, tripDay: { tripId } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (status !== undefined && Object.values(TripDayExperienceStatus).includes(status)) {
      data.status = status
    }
    if (startTime !== undefined) data.startTime = startTime
    if (endTime !== undefined) data.endTime = endTime
    if (notes !== undefined) data.notes = notes?.trim() || null
    if (orderIndex !== undefined) data.orderIndex = orderIndex
    if (hikeId !== undefined) data.hikeId = hikeId
    if (diningId !== undefined) data.diningId = diningId
    if (attractionId !== undefined) data.attractionId = attractionId
    if (concertId !== undefined) data.concertId = concertId

    const updated = await prisma.tripDayExperience.update({
      where: { id: itemId },
      data,
      include: {
        tripDay: true,
        dining: true,
        attraction: true,
        concert: true,
        hike: true,
        sport: true,
        adventure: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Trip day experience update error:', error)
    return NextResponse.json({ error: 'Failed to update experience' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; itemId: string }> }
) {
  try {
    const { tripId, itemId } = await params

    const existing = await prisma.tripDayExperience.findFirst({
      where: { id: itemId, tripDay: { tripId } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Experience not found' }, { status: 404 })
    }

    await prisma.tripDayExperience.delete({ where: { id: itemId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trip day experience delete error:', error)
    return NextResponse.json({ error: 'Failed to delete experience' }, { status: 500 })
  }
}
