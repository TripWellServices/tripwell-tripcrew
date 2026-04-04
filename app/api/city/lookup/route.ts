import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/city/lookup?city=Falmouth&state=MA&country=USA
 * Returns guide-style fields for the matching City row (case-insensitive name).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityName = searchParams.get('city')?.trim()
    const state = searchParams.get('state')?.trim() || undefined
    const country = searchParams.get('country')?.trim() || 'USA'

    if (!cityName) {
      return NextResponse.json({ error: 'city is required' }, { status: 400 })
    }

    const select = {
      id: true,
      name: true,
      state: true,
      country: true,
      tagline: true,
      description: true,
      bestTimeToVisit: true,
      attractionNames: true,
    } as const

    let city = await prisma.city.findFirst({
      where: {
        name: { equals: cityName, mode: 'insensitive' },
        ...(state
          ? { state: { equals: state, mode: 'insensitive' } }
          : {}),
        country: { equals: country, mode: 'insensitive' },
      },
      select,
    })

    if (!city && state) {
      city = await prisma.city.findFirst({
        where: {
          name: { equals: cityName, mode: 'insensitive' },
          country: { equals: country, mode: 'insensitive' },
        },
        select,
      })
    }

    return NextResponse.json({ city })
  } catch (error) {
    console.error('city lookup error:', error)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
