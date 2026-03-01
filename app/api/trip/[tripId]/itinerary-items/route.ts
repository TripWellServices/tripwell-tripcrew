import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ItineraryItemStatus, ItineraryItemType } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params

    const items = await prisma.itineraryItem.findMany({
      where: { tripId },
      orderBy: [{ date: 'asc' }, { day: 'asc' }, { createdAt: 'asc' }],
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

    return NextResponse.json(items)
  } catch (error) {
    console.error('Itinerary items list error:', error)
    return NextResponse.json(
      { error: 'Failed to list itinerary items' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params
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

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const trip = await prisma.trip.findUnique({ where: { id: tripId } })
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const item = await prisma.itineraryItem.create({
      data: {
        tripId,
        title: title.trim(),
        status:
          status && Object.values(ItineraryItemStatus).includes(status)
            ? status
            : ItineraryItemStatus.CONSIDERING,
        dateText: dateText?.trim() || null,
        date: date ? new Date(date) : null,
        day: day?.trim() || null,
        destinationId: destinationId || null,
        lodgingId: lodgingId || null,
        diningId: diningId || null,
        attractionId: attractionId || null,
        stuffToDoId: stuffToDoId || null,
        concertId: concertId || null,
        type:
          type && Object.values(ItineraryItemType).includes(type)
            ? type
            : undefined,
        location: location?.trim() || null,
        venue: venue?.trim() || null,
        notes: notes?.trim() || null,
        suggestedById: suggestedById || null,
      },
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

    return NextResponse.json(item)
  } catch (error) {
    console.error('Itinerary item create error:', error)
    return NextResponse.json(
      { error: 'Failed to create itinerary item' },
      { status: 500 }
    )
  }
}
