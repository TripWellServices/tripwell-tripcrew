import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { StuffToDoType } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')
    const season = searchParams.get('season')
    const type = searchParams.get('type')

    if (!cityId) {
      return NextResponse.json(
        { error: 'cityId is required' },
        { status: 400 }
      )
    }

    const items = await prisma.stuffToDoItem.findMany({
      where: {
        cityId,
        ...(season && { season }),
        ...(type &&
          Object.values(StuffToDoType).includes(type as StuffToDoType) && {
            type: type as StuffToDoType,
          }),
      },
      orderBy: [{ season: 'asc' }, { type: 'asc' }, { name: 'asc' }],
      include: { city: true },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Stuff-to-do list error:', error)
    return NextResponse.json(
      { error: 'Failed to list stuff to do' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cityId, season, type, name, description } = body

    if (!cityId || !name?.trim()) {
      return NextResponse.json(
        { error: 'cityId and name are required' },
        { status: 400 }
      )
    }
    if (!type || !Object.values(StuffToDoType).includes(type)) {
      return NextResponse.json(
        { error: 'type must be ATTRACTION, RESTAURANT, or NEAT_THING' },
        { status: 400 }
      )
    }

    const city = await prisma.city.findUnique({ where: { id: cityId } })
    if (!city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 })
    }

    const item = await prisma.stuffToDoItem.create({
      data: {
        cityId,
        season: season?.trim() || 'any',
        type: type as StuffToDoType,
        name: name.trim(),
        description: description?.trim() || null,
      },
      include: { city: true },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Stuff-to-do create error:', error)
    return NextResponse.json(
      { error: 'Failed to create stuff to do item' },
      { status: 500 }
    )
  }
}
