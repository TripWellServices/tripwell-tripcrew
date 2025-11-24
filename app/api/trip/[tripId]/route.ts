import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: params.tripId },
      include: {
        owner: true,
        lodging: true,
        dining: true,
        attractions: true,
        logistics: true,
        packItems: true,
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

