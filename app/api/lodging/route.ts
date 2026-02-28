import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** List lodging artifacts (reusable). Filter by tripWellEnterpriseId or tripId. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripWellEnterpriseId = searchParams.get('tripWellEnterpriseId')
    const tripId = searchParams.get('tripId')

    const lodging = await prisma.lodging.findMany({
      where: {
        ...(tripWellEnterpriseId && { tripWellEnterpriseId }),
        ...(tripId && { tripId }),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(lodging)
  } catch (error) {
    console.error('Lodging list error:', error)
    return NextResponse.json(
      { error: 'Failed to list lodging' },
      { status: 500 }
    )
  }
}

/** Create a lodging artifact (reusable). Optional tripId (legacy) or tripWellEnterpriseId. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tripId,
      tripWellEnterpriseId,
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

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const lodging = await prisma.lodging.create({
      data: {
        tripId: tripId || null,
        tripWellEnterpriseId: tripWellEnterpriseId || null,
        title: title.trim(),
        address: address?.trim() || null,
        website: website?.trim() || null,
        phone: phone?.trim() || null,
        googlePlaceId: googlePlaceId?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        rating: typeof rating === 'number' ? rating : null,
        lat: typeof lat === 'number' ? lat : null,
        lng: typeof lng === 'number' ? lng : null,
      },
    })

    return NextResponse.json(lodging)
  } catch (error) {
    console.error('Lodging create error:', error)
    return NextResponse.json(
      { error: 'Failed to create lodging' },
      { status: 500 }
    )
  }
}
