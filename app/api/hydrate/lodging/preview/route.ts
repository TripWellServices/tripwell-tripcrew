import { NextRequest, NextResponse } from 'next/server'
import { resolveGooglePlacesApiKey, googlePlacesErrorMessage } from '@/lib/google-places-config'
import { parseStructuredAddressFromGoogle } from '@/lib/lodging/parseGoogleAddress'

export const dynamic = 'force-dynamic'

/** Hydrate lodging fields from Google Places without persisting (pre-trip wizard). */
export async function POST(request: NextRequest) {
  try {
    const { placeId } = await request.json()

    if (!placeId?.trim()) {
      return NextResponse.json({ error: 'placeId is required' }, { status: 400 })
    }

    const apiKey = resolveGooglePlacesApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Places API key not configured' },
        { status: 500 }
      )
    }

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,formatted_address,address_components,formatted_phone_number,website,rating,photos,geometry&key=${apiKey}`

    const detailsResponse = await fetch(detailsUrl)
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

    const place = detailsData.result
    const structured = parseStructuredAddressFromGoogle(place.address_components)
    const photoRef = place.photos?.[0]?.photo_reference
    const imageUrl = photoRef
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${apiKey}`
      : null

    return NextResponse.json({
      title: place.name,
      address: place.formatted_address,
      streetAddress: structured.streetAddress,
      city: structured.city,
      state: structured.state,
      postalCode: structured.postalCode,
      countryCode: structured.countryCode,
      phone: place.formatted_phone_number ?? null,
      website: place.website ?? null,
      googlePlaceId: placeId,
      imageUrl,
      rating: place.rating ?? null,
      lat: place.geometry?.location?.lat ?? null,
      lng: place.geometry?.location?.lng ?? null,
    })
  } catch (error) {
    console.error('Lodging preview hydration error:', error)
    return NextResponse.json({ error: 'Failed to hydrate lodging' }, { status: 500 })
  }
}
