import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDistance, estimateDriveTime } from '@/lib/distance'

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

    // Fetch place details
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,rating,photos,geometry,types&key=${apiKey}`
    
    const detailsResponse = await fetch(detailsUrl)
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

    const place = detailsData.result
    const photoRef = place.photos?.[0]?.photo_reference
    const imageUrl = photoRef
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${apiKey}`
      : null

    // Get lodging location for distance calculation
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
        place.geometry.location.lat,
        place.geometry.location.lng
      )
      driveTimeMinutes = estimateDriveTime(distanceFromLodging)
    }

    // Determine category from types
    const category = place.types
      ?.find((t: string) =>
        ['tourist_attraction', 'museum', 'park', 'zoo', 'aquarium', 'amusement_park'].some((cat) =>
          t.includes(cat)
        )
      )
      ?.replace(/_/g, ' ') || 'attraction'

    // Create or update attraction entry
    const attraction = await prisma.attraction.upsert({
      where: {
        googlePlaceId: placeId,
      },
      update: {
        title: place.name,
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
      },
      create: {
        tripId,
        googlePlaceId: placeId,
        title: place.name,
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

