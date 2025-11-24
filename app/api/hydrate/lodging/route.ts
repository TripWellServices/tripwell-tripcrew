import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,rating,photos,geometry&key=${apiKey}`
    
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
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${apiKey}`
      : null

    // Create or update lodging entry (only one per trip)
    const lodging = await prisma.lodging.upsert({
      where: {
        tripId,
      },
      update: {
        title: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        website: place.website,
        googlePlaceId: placeId,
        imageUrl,
        rating: place.rating,
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
      },
      create: {
        tripId,
        title: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        website: place.website,
        googlePlaceId: placeId,
        imageUrl,
        rating: place.rating,
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
      },
    })

    return NextResponse.json(lodging)
  } catch (error) {
    console.error('Lodging hydration error:', error)
    return NextResponse.json(
      { error: 'Failed to hydrate lodging' },
      { status: 500 }
    )
  }
}

