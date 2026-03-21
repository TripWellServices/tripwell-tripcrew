import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cityGuideInclude, cityToGuideDto } from '@/lib/city-as-guide-dto'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/city-guides/[id]
 * id = City.id (catalogue place id)
 * Body: partial { tagline?, description?, bestTimeToVisit?, attractionNames?, imageUrl?, citySlug? }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const existing = await prisma.city.findUnique({ where: { id } })
    if (!existing || !existing.citySlug) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (typeof body.tagline === 'string') data.tagline = body.tagline.trim() || null
    if (typeof body.description === 'string') data.description = body.description.trim() || null
    if (typeof body.bestTimeToVisit === 'string')
      data.bestTimeToVisit = body.bestTimeToVisit.trim() || null
    if (Array.isArray(body.attractionNames)) {
      data.attractionNames = body.attractionNames
        .filter((s: unknown): s is string => typeof s === 'string')
        .map((s: string) => s.trim())
        .filter(Boolean)
    }
    if (typeof body.imageUrl === 'string') data.imageUrl = body.imageUrl.trim() || null
    const nextSlug =
      typeof body.citySlug === 'string' && body.citySlug.trim()
        ? body.citySlug.trim()
        : typeof body.slug === 'string' && body.slug.trim()
          ? body.slug.trim()
          : null
    if (nextSlug && nextSlug !== existing.citySlug) {
      const taken = await prisma.city.findUnique({ where: { citySlug: nextSlug } })
      if (taken) {
        return NextResponse.json({ error: 'citySlug already in use' }, { status: 409 })
      }
      data.citySlug = nextSlug
    }

    const city = await prisma.city.update({
      where: { id },
      data,
      include: cityGuideInclude,
    })

    const guide = cityToGuideDto(city)
    return NextResponse.json({ guide })
  } catch (error) {
    console.error('city-guides PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update city guide' }, { status: 500 })
  }
}
