import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureWishlistForTraveler } from '@/lib/ensure-wishlist'

export const dynamic = 'force-dynamic'

const hikeInclude = { city: true, createdBy: { select: { id: true, firstName: true, lastName: true } } } as const
const concertInclude = { city: true } as const
const diningInclude = { city: true } as const
const attractionInclude = { city: true } as const

type WishlistApiItem = {
  id: string
  title: string
  notes: string | null
  concert: unknown
  hike: unknown
  dining: unknown
  attraction: unknown
  updatedAt: Date
}

function titleForHike(h: { name: string }) {
  return h.name
}
function titleForConcert(c: { name: string }) {
  return c.name
}
function titleForDining(d: { title: string }) {
  return d.title
}
function titleForAttraction(a: { title: string }) {
  return a.title
}

/**
 * GET /api/wishlist?travelerId= — aggregate rows on this traveler's wishlist (by wishlistId).
 * GET /api/wishlist?id=&travelerId= — one saved catalogue row (must be on that traveler's list).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const travelerId = searchParams.get('travelerId')
    const id = searchParams.get('id')

    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const wishlist = await prisma.wishlist.findUnique({ where: { travelerId } })
    if (!wishlist) {
      if (id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ items: [] })
    }

    if (id) {
      const wId = wishlist.id
      const hike = await prisma.hike.findFirst({
        where: { id, wishlistId: wId },
        include: hikeInclude,
      })
      if (hike) {
        return NextResponse.json({
          item: {
            id: hike.id,
            title: titleForHike(hike),
            notes: null,
            concert: null,
            hike,
            dining: null,
            attraction: null,
          },
        })
      }
      const concert = await prisma.concert.findFirst({
        where: { id, wishlistId: wId },
        include: concertInclude,
      })
      if (concert) {
        return NextResponse.json({
          item: {
            id: concert.id,
            title: titleForConcert(concert),
            notes: null,
            concert,
            hike: null,
            dining: null,
            attraction: null,
          },
        })
      }
      const dining = await prisma.dining.findFirst({
        where: { id, wishlistId: wId },
        include: diningInclude,
      })
      if (dining) {
        return NextResponse.json({
          item: {
            id: dining.id,
            title: titleForDining(dining),
            notes: null,
            concert: null,
            hike: null,
            dining,
            attraction: null,
          },
        })
      }
      const attraction = await prisma.attraction.findFirst({
        where: { id, wishlistId: wId },
        include: attractionInclude,
      })
      if (attraction) {
        return NextResponse.json({
          item: {
            id: attraction.id,
            title: titleForAttraction(attraction),
            notes: null,
            concert: null,
            hike: null,
            dining: null,
            attraction,
          },
        })
      }
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const wId = wishlist.id
    const [hikes, concerts, diningRows, attractions] = await Promise.all([
      prisma.hike.findMany({
        where: { wishlistId: wId },
        orderBy: { updatedAt: 'desc' },
        include: hikeInclude,
      }),
      prisma.concert.findMany({
        where: { wishlistId: wId },
        orderBy: { updatedAt: 'desc' },
        include: concertInclude,
      }),
      prisma.dining.findMany({
        where: { wishlistId: wId },
        orderBy: { updatedAt: 'desc' },
        include: diningInclude,
      }),
      prisma.attraction.findMany({
        where: { wishlistId: wId },
        orderBy: { updatedAt: 'desc' },
        include: attractionInclude,
      }),
    ])

    const items: WishlistApiItem[] = [
      ...hikes.map((hike) => ({
        id: hike.id,
        title: titleForHike(hike),
        notes: null,
        concert: null,
        hike,
        dining: null,
        attraction: null,
        updatedAt: hike.updatedAt,
      })),
      ...concerts.map((concert) => ({
        id: concert.id,
        title: titleForConcert(concert),
        notes: null,
        concert,
        hike: null,
        dining: null,
        attraction: null,
        updatedAt: concert.updatedAt,
      })),
      ...diningRows.map((dining) => ({
        id: dining.id,
        title: titleForDining(dining),
        notes: null,
        concert: null,
        hike: null,
        dining,
        attraction: null,
        updatedAt: dining.updatedAt,
      })),
      ...attractions.map((attraction) => ({
        id: attraction.id,
        title: titleForAttraction(attraction),
        notes: null,
        concert: null,
        hike: null,
        dining: null,
        attraction,
        updatedAt: attraction.updatedAt,
      })),
    ]

    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    const stripped = items.map(({ updatedAt: _, ...rest }) => rest)

    return NextResponse.json({ items: stripped })
  } catch (error) {
    console.error('Wishlist GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch saved experiences' }, { status: 500 })
  }
}

/**
 * POST /api/wishlist
 * Body: { travelerId, title (ignored for display; entities carry names), concertId? | hikeId? | diningId? | attractionId?, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { travelerId, concertId, hikeId, diningId, attractionId } = body as Record<
      string,
      string | undefined
    >

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const tid = travelerId.trim()
    const ids = [concertId, hikeId, diningId, attractionId].filter(Boolean)
    if (ids.length !== 1) {
      return NextResponse.json(
        { error: 'Exactly one of concertId, hikeId, diningId, attractionId is required' },
        { status: 400 }
      )
    }

    const wishlist = await ensureWishlistForTraveler(tid)

    const patch = {
      wishlistId: wishlist.id,
      savedByTravelerId: tid,
    }

    if (hikeId) {
      const existing = await prisma.hike.findUnique({
        where: { id: hikeId },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Hike not found' }, { status: 404 })
      }
      if (
        existing.savedByTravelerId &&
        existing.savedByTravelerId !== tid
      ) {
        return NextResponse.json(
          { error: 'This experience is already saved by another traveler' },
          { status: 409 }
        )
      }
      const data: {
        wishlistId: string
        savedByTravelerId: string
        createdById?: string
      } = { ...patch }
      if (!existing.createdById) {
        data.createdById = tid
      }
      const hike = await prisma.hike.update({
        where: { id: hikeId },
        data,
        include: hikeInclude,
      })
      return NextResponse.json(
        {
          item: {
            id: hike.id,
            title: titleForHike(hike),
            notes: null,
            concert: null,
            hike,
            dining: null,
            attraction: null,
          },
        },
        { status: 201 }
      )
    }

    if (concertId) {
      const existing = await prisma.concert.findUnique({ where: { id: concertId } })
      if (!existing) {
        return NextResponse.json({ error: 'Concert not found' }, { status: 404 })
      }
      if (existing.savedByTravelerId && existing.savedByTravelerId !== tid) {
        return NextResponse.json(
          { error: 'This experience is already saved by another traveler' },
          { status: 409 }
        )
      }
      const data: {
        wishlistId: string
        savedByTravelerId: string
        createdById?: string
      } = { ...patch }
      if (!existing.createdById) {
        data.createdById = tid
      }
      const concert = await prisma.concert.update({
        where: { id: concertId },
        data,
        include: concertInclude,
      })
      return NextResponse.json(
        {
          item: {
            id: concert.id,
            title: titleForConcert(concert),
            notes: null,
            concert,
            hike: null,
            dining: null,
            attraction: null,
          },
        },
        { status: 201 }
      )
    }

    if (diningId) {
      const existing = await prisma.dining.findUnique({ where: { id: diningId } })
      if (!existing) {
        return NextResponse.json({ error: 'Dining not found' }, { status: 404 })
      }
      if (existing.savedByTravelerId && existing.savedByTravelerId !== tid) {
        return NextResponse.json(
          { error: 'This experience is already saved by another traveler' },
          { status: 409 }
        )
      }
      const data: {
        wishlistId: string
        savedByTravelerId: string
        createdById?: string
      } = { ...patch }
      if (!existing.createdById) {
        data.createdById = tid
      }
      const dining = await prisma.dining.update({
        where: { id: diningId },
        data,
        include: diningInclude,
      })
      return NextResponse.json(
        {
          item: {
            id: dining.id,
            title: titleForDining(dining),
            notes: null,
            concert: null,
            hike: null,
            dining,
            attraction: null,
          },
        },
        { status: 201 }
      )
    }

    const attractionIdVal = attractionId!
    const existing = await prisma.attraction.findUnique({ where: { id: attractionIdVal } })
    if (!existing) {
      return NextResponse.json({ error: 'Attraction not found' }, { status: 404 })
    }
    if (existing.savedByTravelerId && existing.savedByTravelerId !== tid) {
      return NextResponse.json(
        { error: 'This experience is already saved by another traveler' },
        { status: 409 }
      )
    }
    const data: {
      wishlistId: string
      savedByTravelerId: string
      createdById?: string
    } = { ...patch }
    if (!existing.createdById) {
      data.createdById = tid
    }
    const attraction = await prisma.attraction.update({
      where: { id: attractionIdVal },
      data,
      include: attractionInclude,
    })
    return NextResponse.json(
      {
        item: {
          id: attraction.id,
          title: titleForAttraction(attraction),
          notes: null,
          concert: null,
          hike: null,
          dining: null,
          attraction,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Wishlist POST error:', error)
    return NextResponse.json({ error: 'Failed to save experience' }, { status: 500 })
  }
}

/**
 * DELETE /api/wishlist?id=&travelerId=
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const travelerId = searchParams.get('travelerId')

    if (!id || !travelerId?.trim()) {
      return NextResponse.json({ error: 'id and travelerId are required' }, { status: 400 })
    }

    const wishlist = await prisma.wishlist.findUnique({ where: { travelerId: travelerId.trim() } })
    if (!wishlist) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const clear = {
      wishlistId: null,
      savedByTravelerId: null,
    }

    const wId = wishlist.id
    const hike = await prisma.hike.findFirst({ where: { id, wishlistId: wId } })
    if (hike) {
      await prisma.hike.update({ where: { id }, data: clear })
      return NextResponse.json({ success: true })
    }
    const concert = await prisma.concert.findFirst({ where: { id, wishlistId: wId } })
    if (concert) {
      await prisma.concert.update({ where: { id }, data: clear })
      return NextResponse.json({ success: true })
    }
    const dining = await prisma.dining.findFirst({ where: { id, wishlistId: wId } })
    if (dining) {
      await prisma.dining.update({ where: { id }, data: clear })
      return NextResponse.json({ success: true })
    }
    const attraction = await prisma.attraction.findFirst({ where: { id, wishlistId: wId } })
    if (attraction) {
      await prisma.attraction.update({ where: { id }, data: clear })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    console.error('Wishlist DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove saved experience' }, { status: 500 })
  }
}
