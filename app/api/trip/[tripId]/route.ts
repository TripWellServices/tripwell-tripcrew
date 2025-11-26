import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    // Use standard, safe, parent-aware hydration
    const trip = await prisma.trip.findUnique({
      where: { id: params.tripId },
      include: {
        lodging: true,
        dining: {
          where: { tripId: params.tripId },
          orderBy: { createdAt: 'desc' },
        },
        attractions: {
          where: { tripId: params.tripId },
          orderBy: { createdAt: 'desc' },
        },
        logistics: {
          where: { tripId: params.tripId },
          orderBy: { createdAt: 'desc' },
        },
        packItems: {
          where: { tripId: params.tripId },
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

