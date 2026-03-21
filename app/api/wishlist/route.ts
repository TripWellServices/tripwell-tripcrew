import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const includeRelations = {
  concert: true,
  hike: true,
  dining: true,
  attraction: true,
} as const

/**
 * GET /api/wishlist?travelerId=xxx — list all saved experiences for the traveler.
 * GET /api/wishlist?id=xxx&travelerId=xxx — single ExperienceWishlist (must belong to traveler).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const travelerId = searchParams.get('travelerId')
    const id = searchParams.get('id')

    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    if (id) {
      const item = await prisma.experienceWishlist.findFirst({
        where: { id, travelerId },
        include: includeRelations,
      })
      if (!item) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ item })
    }

    const items = await prisma.experienceWishlist.findMany({
      where: { travelerId },
      orderBy: { createdAt: 'desc' },
      include: includeRelations,
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Wishlist GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch saved experiences' }, { status: 500 })
  }
}

/**
 * POST /api/wishlist
 * Body: { travelerId, title, concertId? | hikeId? | diningId? | attractionId?, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { travelerId, title, notes, concertId, hikeId, diningId, attractionId } = body

    if (!travelerId || !title) {
      return NextResponse.json({ error: 'travelerId and title are required' }, { status: 400 })
    }

    const item = await prisma.experienceWishlist.create({
      data: {
        travelerId,
        title,
        notes: notes ?? null,
        concertId: concertId ?? null,
        hikeId: hikeId ?? null,
        diningId: diningId ?? null,
        attractionId: attractionId ?? null,
      },
      include: includeRelations,
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Wishlist POST error:', error)
    return NextResponse.json({ error: 'Failed to save experience' }, { status: 500 })
  }
}

/**
 * DELETE /api/wishlist?id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await prisma.experienceWishlist.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Wishlist DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove saved experience' }, { status: 500 })
  }
}
