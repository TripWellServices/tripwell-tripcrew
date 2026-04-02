import { NextRequest, NextResponse } from 'next/server'
import { resolveTripWellEnterpriseId } from '@/config/tripWellEnterpriseConfig'
import { prisma } from '@/lib/prisma'
import { wishlistIdForTraveler } from '@/lib/traveler-build-scope'

export const dynamic = 'force-dynamic'

/** List dining artifacts (reusable). Filter by tripWellEnterpriseId, tripId, travelerId (build scope), or savedByTravelerId. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripWellEnterpriseId = searchParams.get('tripWellEnterpriseId')
    const tripId = searchParams.get('tripId')
    const travelerId = searchParams.get('travelerId')?.trim()
    const savedByTravelerId = searchParams.get('savedByTravelerId')?.trim()

    if (travelerId) {
      const wId = await wishlistIdForTraveler(travelerId)
      const dining = await prisma.dining.findMany({
        where: {
          OR: [
            { savedByTravelerId: travelerId },
            { createdById: travelerId },
            ...(wId ? [{ wishlistId: wId }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: { city: true },
      })
      return NextResponse.json({ dining })
    }

    if (savedByTravelerId) {
      const dining = await prisma.dining.findMany({
        where: { savedByTravelerId },
        orderBy: { createdAt: 'desc' },
        include: { city: true },
      })
      return NextResponse.json({ dining })
    }

    const dining = await prisma.dining.findMany({
      where: {
        ...(tripWellEnterpriseId && { tripWellEnterpriseId }),
        ...(tripId && { tripId }),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(dining)
  } catch (error) {
    console.error('Dining list error:', error)
    return NextResponse.json(
      { error: 'Failed to list dining' },
      { status: 500 }
    )
  }
}

/** Create a dining artifact (reusable). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tripId,
      tripWellEnterpriseId,
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
    } = body

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const dining = await prisma.dining.create({
      data: {
        tripId: tripId || null,
        tripWellEnterpriseId: resolveTripWellEnterpriseId(tripWellEnterpriseId),
        title: title.trim(),
        category: category?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        website: website?.trim() || null,
        googlePlaceId: googlePlaceId?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        rating: typeof rating === 'number' ? rating : null,
        lat: typeof lat === 'number' ? lat : null,
        lng: typeof lng === 'number' ? lng : null,
        distanceFromLodging:
          typeof distanceFromLodging === 'number' ? distanceFromLodging : null,
        driveTimeMinutes:
          typeof driveTimeMinutes === 'number' ? driveTimeMinutes : null,
      },
    })

    return NextResponse.json(dining)
  } catch (error) {
    console.error('Dining create error:', error)
    return NextResponse.json(
      { error: 'Failed to create dining' },
      { status: 500 }
    )
  }
}
