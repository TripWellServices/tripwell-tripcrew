import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const lodging = await prisma.lodging.findUnique({
      where: { id },
    })

    if (!lodging) {
      return NextResponse.json({ error: 'Lodging not found' }, { status: 404 })
    }

    return NextResponse.json(lodging)
  } catch (error) {
    console.error('Lodging fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lodging' },
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
      address,
      website,
      phone,
      googlePlaceId,
      imageUrl,
      rating,
      lat,
      lng,
    } = body

    const existing = await prisma.lodging.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Lodging not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title?.trim() ?? existing.title
    if (address !== undefined) data.address = address?.trim() || null
    if (website !== undefined) data.website = website?.trim() || null
    if (phone !== undefined) data.phone = phone?.trim() || null
    if (googlePlaceId !== undefined)
      data.googlePlaceId = googlePlaceId?.trim() || null
    if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() || null
    if (rating !== undefined) data.rating = typeof rating === 'number' ? rating : null
    if (lat !== undefined) data.lat = typeof lat === 'number' ? lat : null
    if (lng !== undefined) data.lng = typeof lng === 'number' ? lng : null

    const updated = await prisma.lodging.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Lodging update error:', error)
    return NextResponse.json(
      { error: 'Failed to update lodging' },
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

    const existing = await prisma.lodging.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Lodging not found' },
        { status: 404 }
      )
    }

    await prisma.lodging.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Lodging delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete lodging' },
      { status: 500 }
    )
  }
}
