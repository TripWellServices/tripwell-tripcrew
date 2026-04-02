import { NextRequest, NextResponse } from 'next/server'
import { resolveTripWellEnterpriseId } from '@/config/tripWellEnterpriseConfig'
import { prisma } from '@/lib/prisma'
import { wishlistIdForTraveler } from '@/lib/traveler-build-scope'

export const dynamic = 'force-dynamic'

/** List attraction artifacts (reusable). Filter by tripWellEnterpriseId, tripId, travelerId (build scope), or savedByTravelerId. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripWellEnterpriseId = searchParams.get('tripWellEnterpriseId')
    const tripId = searchParams.get('tripId')
    const travelerId = searchParams.get('travelerId')?.trim()
    const savedByTravelerId = searchParams.get('savedByTravelerId')?.trim()

    if (travelerId) {
      const wId = await wishlistIdForTraveler(travelerId)
      const attractions = await prisma.attraction.findMany({
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
      return NextResponse.json({ attractions })
    }

    if (savedByTravelerId) {
      const attractions = await prisma.attraction.findMany({
        where: { savedByTravelerId },
        orderBy: { createdAt: 'desc' },
        include: { city: true },
      })
      return NextResponse.json({ attractions })
    }

    const attractions = await prisma.attraction.findMany({
      where: {
        ...(tripWellEnterpriseId && { tripWellEnterpriseId }),
        ...(tripId && { tripId }),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(attractions)
  } catch (error) {
    console.error('Attractions list error:', error)
    return NextResponse.json(
      { error: 'Failed to list attractions' },
      { status: 500 }
    )
  }
}

/** Create an attraction artifact (reusable). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tripId,
      tripWellEnterpriseId,
      cityId,
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

    const attraction = await prisma.attraction.create({
      data: {
        tripId: tripId || null,
        tripWellEnterpriseId: resolveTripWellEnterpriseId(tripWellEnterpriseId),
        cityId: cityId?.trim() || null,
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

    return NextResponse.json(attraction)
  } catch (error) {
    console.error('Attraction create error:', error)
    return NextResponse.json(
      { error: 'Failed to create attraction' },
      { status: 500 }
    )
  }
}
