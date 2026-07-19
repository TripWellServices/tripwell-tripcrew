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
import { resolveGooglePlacesApiKey, googlePlacesErrorMessage } from '@/lib/google-places-config'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { placeId, tripId, cityId, whyMustDo, bestCombinedWith } = await request.json()

    if (!placeId || !tripId) {
      return NextResponse.json(
        { error: 'placeId and tripId are required' },
        { status: 400 }
      )
    }

    const apiKey = resolveGooglePlacesApiKey()
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
        {
          error: googlePlacesErrorMessage(
            detailsData.status,
            typeof detailsData.error_message === 'string' ? detailsData.error_message : null
          ),
        },
        { status: detailsData.status === 'REQUEST_DENIED' ? 503 : 404 }
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
        ['tourist_attraction', 'museum', 'park', 'zoo', 'aquarium', 'amusement_park'].some((cat) =>
          t.includes(cat)
        )
      )
      ?.replace(/_/g, ' ') || 'attraction'

    const existing = await prisma.attraction.findUnique({
      where: { googlePlaceId: placeId },
    })
    const googlePatch = googlePlaceMetadataPatch(place)
    const metadata = mergeExperienceMetadata(existing?.metadata, googlePatch)
    const description = pickDescriptionAfterHydrate(existing?.description, place)
    const plannerWhy =
      typeof whyMustDo === 'string' && whyMustDo.trim()
        ? whyMustDo.trim()
        : existing?.whyMustDo ?? null
    const plannerCombined =
      typeof bestCombinedWith === 'string' && bestCombinedWith.trim()
        ? bestCombinedWith.trim()
        : existing?.bestCombinedWith ?? null

    const attraction = await prisma.attraction.upsert({
      where: {
        googlePlaceId: placeId,
      },
      update: {
        title: place.name ?? existing?.title ?? 'Attraction',
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
        whyMustDo: plannerWhy,
        bestCombinedWith: plannerCombined,
        metadata: metadata as Prisma.InputJsonValue,
      },
      create: {
        tripId,
        cityId: typeof cityId === 'string' && cityId.trim() ? cityId.trim() : null,
        googlePlaceId: placeId,
        title: place.name ?? 'Attraction',
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
        whyMustDo: plannerWhy,
        bestCombinedWith: plannerCombined,
        metadata: metadata as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json(attraction)
  } catch (error) {
    console.error('Attraction hydration error:', error)
    return NextResponse.json(
      { error: 'Failed to hydrate attraction' },
      { status: 500 }
    )
  }
}
