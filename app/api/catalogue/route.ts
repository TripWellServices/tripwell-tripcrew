import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['concert', 'hike', 'dining', 'attraction'] as const
type CatalogueType = (typeof VALID_TYPES)[number]

/**
 * GET /api/catalogue?city=Nashville&state=TN&type=hike
 *
 * Returns first-class records (Concert | Hike | Dining | Attraction) from the
 * global city catalogue. City is matched by name (case-insensitive); state is
 * optional but helps disambiguate (e.g. Nashville, TN vs Nashville, AR).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityName = searchParams.get('city')?.trim()
    const state = searchParams.get('state')?.trim() || undefined
    const type = searchParams.get('type')?.trim() as CatalogueType | null

    if (!cityName) {
      return NextResponse.json({ error: 'city query param is required' }, { status: 400 })
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Find the City row (case-insensitive name match)
    const cityWhere = {
      name: { equals: cityName, mode: 'insensitive' as const },
      ...(state ? { state: { equals: state, mode: 'insensitive' as const } } : {}),
    }

    const city = await prisma.city.findFirst({ where: cityWhere, select: { id: true, name: true, state: true, country: true } })

    if (!city) {
      // City not in DB yet — return empty catalogue (discover flow will populate it)
      return NextResponse.json({ city: null, items: [] })
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
        where: { cityId: city.id },
        orderBy: { title: 'asc' },
      })
    }

    return NextResponse.json({ city, items })
  } catch (error) {
    console.error('Catalogue GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch catalogue' }, { status: 500 })
  }
}
