import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const attraction = await prisma.attraction.findUnique({
      where: { id },
    })

    if (!attraction) {
      return NextResponse.json(
        { error: 'Attraction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(attraction)
  } catch (error) {
    console.error('Attraction fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attraction' },
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

    const existing = await prisma.attraction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Attraction not found' },
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

    const updated = await prisma.attraction.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Attraction update error:', error)
    return NextResponse.json(
      { error: 'Failed to update attraction' },
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

    const existing = await prisma.attraction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Attraction not found' },
        { status: 404 }
      )
    }

    await prisma.attraction.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Attraction delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete attraction' },
      { status: 500 }
    )
  }
}
