import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/wishlist?travelerId=xxx
 * Returns all WishlistItems for the traveler, including related first-class objects.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const travelerId = searchParams.get('travelerId')

    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const items = await prisma.wishlistItem.findMany({
      where: { travelerId },
      orderBy: { createdAt: 'desc' },
      include: {
        concert:    true,
        hike:       true,
        dining:     true,
        attraction: true,
      },
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Wishlist GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 })
  }
}

/**
 * POST /api/wishlist
 * Body: { travelerId, title, concertId? | hikeId? | diningId? | attractionId?, notes? }
 * Creates a WishlistItem bookmark for the traveler.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { travelerId, title, notes, concertId, hikeId, diningId, attractionId } = body

    if (!travelerId || !title) {
      return NextResponse.json({ error: 'travelerId and title are required' }, { status: 400 })
    }

    const item = await prisma.wishlistItem.create({
      data: {
        travelerId,
        title,
        notes: notes ?? null,
        concertId:    concertId    ?? null,
        hikeId:       hikeId       ?? null,
        diningId:     diningId     ?? null,
        attractionId: attractionId ?? null,
      },
      include: {
        concert:    true,
        hike:       true,
        dining:     true,
        attraction: true,
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Wishlist POST error:', error)
    return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 })
  }
}

/**
 * DELETE /api/wishlist?id=xxx
 * Removes a WishlistItem by its own ID.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await prisma.wishlistItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Wishlist DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 })
  }
}
