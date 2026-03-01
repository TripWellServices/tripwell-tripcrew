import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ItineraryItemStatus, ItineraryItemType } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; itemId: string }> }
) {
  try {
    const { tripId, itemId } = await params
    const body = await request.json()
    const {
      title,
      status,
      dateText,
      date,
      day,
      destinationId,
      lodgingId,
      diningId,
      attractionId,
      stuffToDoId,
      concertId,
      type,
      location,
      venue,
      notes,
      suggestedById,
    } = body

    const existing = await prisma.itineraryItem.findFirst({
      where: { id: itemId, tripId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Itinerary item not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title?.trim() ?? existing.title
    if (status !== undefined && Object.values(ItineraryItemStatus).includes(status))
      data.status = status
    if (dateText !== undefined) data.dateText = dateText?.trim() || null
    if (date !== undefined) data.date = date ? new Date(date) : null
    if (day !== undefined) data.day = day?.trim() || null
    if (destinationId !== undefined) data.destinationId = destinationId || null
    if (lodgingId !== undefined) data.lodgingId = lodgingId || null
    if (diningId !== undefined) data.diningId = diningId || null
    if (attractionId !== undefined) data.attractionId = attractionId || null
    if (stuffToDoId !== undefined) data.stuffToDoId = stuffToDoId || null
    if (concertId !== undefined) data.concertId = concertId || null
    if (type !== undefined && Object.values(ItineraryItemType).includes(type))
      data.type = type
    if (location !== undefined) data.location = location?.trim() || null
    if (venue !== undefined) data.venue = venue?.trim() || null
    if (notes !== undefined) data.notes = notes?.trim() || null
    if (suggestedById !== undefined) data.suggestedById = suggestedById || null

    const updated = await prisma.itineraryItem.update({
      where: { id: itemId },
      data,
      include: {
        destination: { include: { city: true } },
        lodging: true,
        dining: true,
        attraction: true,
        stuffToDo: true,
        concert: true,
        suggestedBy: {
          select: { id: true, firstName: true, lastName: true, photoURL: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Itinerary item update error:', error)
    return NextResponse.json(
      { error: 'Failed to update itinerary item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; itemId: string }> }
) {
  try {
    const { tripId, itemId } = await params

    const existing = await prisma.itineraryItem.findFirst({
      where: { id: itemId, tripId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Itinerary item not found' },
        { status: 404 }
      )
    }

    await prisma.itineraryItem.delete({
      where: { id: itemId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Itinerary item delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete itinerary item' },
      { status: 500 }
    )
  }
}
