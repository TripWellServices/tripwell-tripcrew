import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { itemId, itemType, itineraryDay } = await request.json()

    if (!itemId || !itemType) {
      return NextResponse.json(
        { error: 'itemId and itemType are required' },
        { status: 400 }
      )
    }

    if (itemType === 'dining') {
      const item = await prisma.dining.update({
        where: { id: itemId },
        data: {
          itineraryDay: itineraryDay ? new Date(itineraryDay) : null,
        },
      })
      return NextResponse.json(item)
    } else if (itemType === 'attraction') {
      const item = await prisma.attraction.update({
        where: { id: itemId },
        data: {
          itineraryDay: itineraryDay ? new Date(itineraryDay) : null,
        },
      })
      return NextResponse.json(item)
    } else {
      return NextResponse.json(
        { error: 'Invalid itemType' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Itinerary update error:', error)
    return NextResponse.json(
      { error: 'Failed to update itinerary' },
      { status: 500 }
    )
  }
}

