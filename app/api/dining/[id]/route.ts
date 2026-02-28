import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const dining = await prisma.dining.findUnique({
      where: { id },
    })

    if (!dining) {
      return NextResponse.json({ error: 'Dining not found' }, { status: 404 })
    }

    return NextResponse.json(dining)
  } catch (error) {
    console.error('Dining fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dining' },
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
    const {
      title,
      category,
      address,
      phone,
      website,
      googlePlaceId,
      imageUrl,
      rating,
      lat,
      lng,
      distanceFromLodging,
      driveTimeMinutes,
      itineraryDay,
    } = body

    const existing = await prisma.dining.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Dining not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title?.trim() ?? existing.title
    if (category !== undefined) data.category = category?.trim() || null
    if (address !== undefined) data.address = address?.trim() || null
    if (phone !== undefined) data.phone = phone?.trim() || null
    if (website !== undefined) data.website = website?.trim() || null
    if (googlePlaceId !== undefined)
      data.googlePlaceId = googlePlaceId?.trim() || null
    if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() || null
    if (rating !== undefined) data.rating = typeof rating === 'number' ? rating : null
    if (lat !== undefined) data.lat = typeof lat === 'number' ? lat : null
    if (lng !== undefined) data.lng = typeof lng === 'number' ? lng : null
    if (distanceFromLodging !== undefined)
      data.distanceFromLodging =
        typeof distanceFromLodging === 'number' ? distanceFromLodging : null
    if (driveTimeMinutes !== undefined)
      data.driveTimeMinutes =
        typeof driveTimeMinutes === 'number' ? driveTimeMinutes : null
    if (itineraryDay !== undefined)
      data.itineraryDay = itineraryDay ? new Date(itineraryDay) : null

    const updated = await prisma.dining.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Dining update error:', error)
    return NextResponse.json(
      { error: 'Failed to update dining' },
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

    const existing = await prisma.dining.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Dining not found' },
        { status: 404 }
      )
    }

    await prisma.dining.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Dining delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete dining' },
      { status: 500 }
    )
  }
}
