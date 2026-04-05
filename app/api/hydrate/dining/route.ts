import type { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDistance, estimateDriveTime } from '@/lib/distance'
import {
  buildPlaceDetailsUrl,
  googlePlaceMetadataPatch,
  mergeExperienceMetadata,
  pickDescriptionAfterHydrate,
  type GooglePlaceResult,
} from '@/lib/google-places-hydrate'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { placeId, tripId } = await request.json()

    if (!placeId || !tripId) {
      return NextResponse.json(
        { error: 'placeId and tripId are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Places API key not configured' },
        { status: 500 }
      )
    }

    const detailsResponse = await fetch(buildPlaceDetailsUrl(placeId, apiKey))
    if (!detailsResponse.ok) {
      throw new Error('Google Places API error')
    }

    const detailsData = await detailsResponse.json()
    if (detailsData.status !== 'OK') {
      return NextResponse.json(
        { error: 'Place not found' },
        { status: 404 }
      )
    }

    const place = detailsData.result as GooglePlaceResult
    const photoRef = place.photos?.[0]?.photo_reference
    const imageUrl = photoRef
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${apiKey}`
      : null

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { lodging: true },
    })

    let distanceFromLodging: number | null = null
    let driveTimeMinutes: number | null = null

    if (trip?.lodging?.lat && trip?.lodging?.lng && place.geometry?.location) {
      distanceFromLodging = calculateDistance(
        trip.lodging.lat,
        trip.lodging.lng,
        place.geometry.location.lat!,
        place.geometry.location.lng!
      )
      driveTimeMinutes = estimateDriveTime(distanceFromLodging)
    }

    const category = place.types
      ?.find((t: string) =>
        ['restaurant', 'cafe', 'bar', 'meal_takeaway', 'food'].some((cat) =>
          t.includes(cat)
        )
      )
      ?.replace(/_/g, ' ') || 'restaurant'

    const existing = await prisma.dining.findUnique({
      where: { googlePlaceId: placeId },
    })
    const googlePatch = googlePlaceMetadataPatch(place)
    const metadata = mergeExperienceMetadata(existing?.metadata, googlePatch)
    const description = pickDescriptionAfterHydrate(existing?.description, place)

    const dining = await prisma.dining.upsert({
      where: {
        googlePlaceId: placeId,
      },
      update: {
        title: place.name ?? existing?.title ?? 'Restaurant',
        category,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        website: place.website,
        imageUrl,
        rating: place.rating,
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
        distanceFromLodging,
        driveTimeMinutes,
        description,
        metadata: metadata as Prisma.InputJsonValue,
      },
      create: {
        tripId,
        googlePlaceId: placeId,
        title: place.name ?? 'Restaurant',
        category,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        website: place.website,
        imageUrl,
        rating: place.rating,
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
        distanceFromLodging,
        driveTimeMinutes,
        description,
        metadata: metadata as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json(dining)
  } catch (error) {
    console.error('Dining hydration error:', error)
    return NextResponse.json(
      { error: 'Failed to hydrate dining' },
      { status: 500 }
    )
  }
}
