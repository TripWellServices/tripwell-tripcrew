import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { baseSlugFromCity } from '@/lib/city-guide-slug'
import { cityGuideInclude, cityToGuideDto } from '@/lib/city-as-guide-dto'

export const dynamic = 'force-dynamic'

async function uniqueCitySlug(
  name: string,
  state: string | null | undefined,
  country: string | null | undefined
) {
  let base = baseSlugFromCity(name, state, country)
  for (let i = 0; i < 8; i++) {
    const citySlug = i === 0 ? base : `${base}-${randomBytes(3).toString('hex')}`
    const taken = await prisma.city.findUnique({ where: { citySlug } })
    if (!taken) return citySlug
  }
  return `${base}-${randomBytes(4).toString('hex')}`
}

/**
 * GET /api/city-guides — list cities that have a guide (citySlug set), newest first
 * GET /api/city-guides?cityId=
 * GET /api/city-guides?citySlug=  (alias: ?slug= for old clients)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')?.trim()
    const citySlug =
      searchParams.get('citySlug')?.trim() || searchParams.get('slug')?.trim()

    if (citySlug) {
      const city = await prisma.city.findUnique({
        where: { citySlug },
        include: cityGuideInclude,
      })
      const guide = city ? cityToGuideDto(city) : null
      if (!guide) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ guide })
    }

    if (cityId) {
      const city = await prisma.city.findUnique({
        where: { id: cityId },
        include: cityGuideInclude,
      })
      const guide = city ? cityToGuideDto(city) : null
      if (!guide) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ guide })
    }

    const cities = await prisma.city.findMany({
      where: { citySlug: { not: null } },
      orderBy: { updatedAt: 'desc' },
      include: cityGuideInclude,
    })
    const guides = cities.map((c) => cityToGuideDto(c)!).filter(Boolean)
    return NextResponse.json({ guides })
  } catch (error) {
    console.error('city-guides GET error:', error)
    return NextResponse.json({ error: 'Failed to list city guides' }, { status: 500 })
  }
}

/**
 * POST /api/city-guides
 * Body: { cityId, travelerId?, citySlug?, tagline?, description?, bestTimeToVisit?, attractionNames?, imageUrl? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      cityId,
      travelerId,
      citySlug: citySlugBody,
      tagline,
      description,
      bestTimeToVisit,
      attractionNames,
      imageUrl,
    } = body as Record<string, unknown>

    if (!cityId || typeof cityId !== 'string') {
      return NextResponse.json({ error: 'cityId is required' }, { status: 400 })
    }

    const city = await prisma.city.findUnique({ where: { id: cityId } })
    if (!city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 })
    }

    if (city.citySlug) {
      return NextResponse.json({ error: 'A guide already exists for this city' }, { status: 409 })
    }

    const citySlug =
      typeof citySlugBody === 'string' && citySlugBody.trim()
        ? citySlugBody.trim()
        : await uniqueCitySlug(city.name, city.state, city.country)

    const takenSlug = await prisma.city.findUnique({ where: { citySlug } })
    if (takenSlug) {
      return NextResponse.json({ error: 'citySlug already in use' }, { status: 409 })
    }

    const names = Array.isArray(attractionNames)
      ? attractionNames.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter(Boolean)
      : []

    const updated = await prisma.city.update({
      where: { id: cityId },
      data: {
        citySlug,
        tagline: typeof tagline === 'string' ? tagline.trim() || null : null,
        description: typeof description === 'string' ? description.trim() || null : null,
        bestTimeToVisit:
          typeof bestTimeToVisit === 'string' ? bestTimeToVisit.trim() || null : null,
        attractionNames: names,
        imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() || null : null,
        guideCreatedById:
          typeof travelerId === 'string' && travelerId.trim() ? travelerId.trim() : null,
      },
      include: cityGuideInclude,
    })

    const guide = cityToGuideDto(updated)
    return NextResponse.json({ guide }, { status: 201 })
  } catch (error) {
    console.error('city-guides POST error:', error)
    return NextResponse.json({ error: 'Failed to create city guide' }, { status: 500 })
  }
}
