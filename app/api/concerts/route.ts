import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')

    const concerts = await prisma.concert.findMany({
      where: cityId ? { cityId } : undefined,
      orderBy: [{ eventDate: 'asc' }, { name: 'asc' }],
      include: { city: true },
    })

    return NextResponse.json(concerts)
  } catch (error) {
    console.error('Concerts list error:', error)
    return NextResponse.json(
      { error: 'Failed to list concerts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, artist, venue, cityId, eventDate, url, imageUrl, description } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const concert = await prisma.concert.create({
      data: {
        name: name.trim(),
        artist: artist?.trim() || null,
        venue: venue?.trim() || null,
        cityId: cityId || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        url: url?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        description: description?.trim() || null,
      },
      include: { city: true },
    })

    return NextResponse.json(concert)
  } catch (error) {
    console.error('Concert create error:', error)
    return NextResponse.json(
      { error: 'Failed to create concert' },
      { status: 500 }
    )
  }
}
