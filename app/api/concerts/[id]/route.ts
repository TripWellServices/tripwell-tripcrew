import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const concert = await prisma.concert.findUnique({
      where: { id },
      include: { city: true },
    })
    if (!concert) {
      return NextResponse.json({ error: 'Concert not found' }, { status: 404 })
    }
    return NextResponse.json(concert)
  } catch (error) {
    console.error('Concert fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch concert' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, artist, venue, cityId, eventDate, url, imageUrl, description } = body

    const existing = await prisma.concert.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Concert not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name?.trim() ?? existing.name
    if (artist !== undefined) data.artist = artist?.trim() || null
    if (venue !== undefined) data.venue = venue?.trim() || null
    if (cityId !== undefined) data.cityId = cityId || null
    if (eventDate !== undefined) data.eventDate = eventDate ? new Date(eventDate) : null
    if (url !== undefined) data.url = url?.trim() || null
    if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() || null
    if (description !== undefined) data.description = description?.trim() || null

    const updated = await prisma.concert.update({
      where: { id },
      data,
      include: { city: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Concert update error:', error)
    return NextResponse.json(
      { error: 'Failed to update concert' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await prisma.concert.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Concert not found' }, { status: 404 })
    }
    await prisma.concert.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Concert delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete concert' },
      { status: 500 }
    )
  }
}
