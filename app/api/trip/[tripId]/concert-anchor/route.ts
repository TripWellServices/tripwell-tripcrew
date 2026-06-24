import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import { attachTripConcertAnchor } from '@/lib/concert-trip-ingest'

export const dynamic = 'force-dynamic'

/**
 * POST /api/trip/[tripId]/concert-anchor
 * Body: { travelerId, concertId }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params
    const body = await request.json().catch(() => ({}))
    const { travelerId, concertId } = body as {
      travelerId?: string
      concertId?: string
    }

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }
    if (!concertId?.trim()) {
      return NextResponse.json({ error: 'concertId is required' }, { status: 400 })
    }

    const access = await getTripAccess(tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const concert = await prisma.concert.findUnique({ where: { id: concertId } })
    if (!concert) {
      return NextResponse.json({ error: 'Concert not found' }, { status: 404 })
    }

    const existing = await prisma.tripConcertAnchor.findUnique({
      where: { tripId_concertId: { tripId, concertId } },
    })
    if (existing) {
      return NextResponse.json({ anchorId: existing.id, concertId })
    }

    const anchorId = await prisma.$transaction(async (tx) =>
      attachTripConcertAnchor(tx, {
        tripId,
        concertId,
        role: 'primary',
      })
    )

    return NextResponse.json({ anchorId, concertId }, { status: 201 })
  } catch (error) {
    console.error('Concert anchor attach error:', error)
    return NextResponse.json(
      { error: 'Failed to attach concert to trip' },
      { status: 500 }
    )
  }
}
