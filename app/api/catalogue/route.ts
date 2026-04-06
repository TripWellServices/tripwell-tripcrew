import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const VALID_TYPES = [
  'concert',
  'hike',
  'dining',
  'attraction',
  'cruise',
  'day_trip',
] as const
type CatalogueType = (typeof VALID_TYPES)[number]

/**
 * GET /api/catalogue?type=hike&cityId=uuid
 * GET /api/catalogue?type=hike&city=Nashville&state=TN
 *
 * Returns first-class records from the global city catalogue.
 * Use cityId when known, or city (+ optional state) for name lookup.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityIdParam = searchParams.get('cityId')?.trim()
    const cityName = searchParams.get('city')?.trim()
    const state = searchParams.get('state')?.trim() || undefined
    const type = searchParams.get('type')?.trim() as CatalogueType | null

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    let city: { id: string; name: string; state: string | null; country: string | null } | null =
      null

    if (cityIdParam) {
      city = await prisma.city.findUnique({
        where: { id: cityIdParam },
        select: { id: true, name: true, state: true, country: true },
      })
      if (!city) {
        return NextResponse.json({ city: null, items: [] })
      }
    } else {
      if (!cityName) {
        return NextResponse.json(
          { error: 'city or cityId query param is required' },
          { status: 400 }
        )
      }

      city = await prisma.city.findFirst({
        where: {
          name: { equals: cityName, mode: 'insensitive' },
          ...(state ? { state: { equals: state, mode: 'insensitive' } } : {}),
        },
        select: { id: true, name: true, state: true, country: true },
      })

      if (!city) {
        return NextResponse.json({ city: null, items: [] })
      }
    }

    let items: unknown[] = []

    if (type === 'concert') {
      items = await prisma.concert.findMany({
        where: { cityId: city.id },
        orderBy: { eventDate: 'asc' },
      })
    } else if (type === 'hike') {
      items = await prisma.hike.findMany({
        where: { cityId: city.id },
        orderBy: { name: 'asc' },
      })
    } else if (type === 'dining') {
      items = await prisma.dining.findMany({
        where: { cityId: city.id },
        orderBy: { title: 'asc' },
      })
    } else if (type === 'attraction') {
      items = await prisma.attraction.findMany({
        where: {
          cityId: city.id,
          OR: [{ category: null }, { category: { not: 'Day trip' } }],
        },
        orderBy: { title: 'asc' },
      })
    } else if (type === 'day_trip') {
      items = await prisma.attraction.findMany({
        where: { cityId: city.id, category: 'Day trip' },
        orderBy: { title: 'asc' },
      })
    } else if (type === 'cruise') {
      items = await prisma.cruise.findMany({
        where: { cityId: city.id },
        orderBy: { name: 'asc' },
      })
    }

    return NextResponse.json({ city, items })
  } catch (error) {
    console.error('Catalogue GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch catalogue' }, { status: 500 })
  }
}
