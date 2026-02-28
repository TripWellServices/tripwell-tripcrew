import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')
    const country = searchParams.get('country')

    const cities = await prisma.city.findMany({
      where: {
        ...(name && { name: { contains: name, mode: 'insensitive' } }),
        ...(country && { country: { contains: country, mode: 'insensitive' } }),
      },
      orderBy: [{ name: 'asc' }, { state: 'asc' }],
    })

    return NextResponse.json(cities)
  } catch (error) {
    console.error('Cities list error:', error)
    return NextResponse.json(
      { error: 'Failed to list cities' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, state, country } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const city = await prisma.city.upsert({
      where: {
        name_state_country: {
          name: name.trim(),
          state: state?.trim() ?? null,
          country: country?.trim() ?? null,
        },
      },
      create: {
        name: name.trim(),
        state: state?.trim() || null,
        country: country?.trim() || null,
      },
      update: {},
    })

    return NextResponse.json(city)
  } catch (error) {
    console.error('City create error:', error)
    return NextResponse.json(
      { error: 'Failed to create city' },
      { status: 500 }
    )
  }
}
