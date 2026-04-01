import { NextRequest, NextResponse } from 'next/server'
import { resolveTripWellEnterpriseId } from '@/config/tripWellEnterpriseConfig'
import { prisma } from '@/lib/prisma'
import {
  parseAmenitiesJson,
  parseLodgingType,
  parseNightlyRate,
} from '@/lib/lodging/apiFields'

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

/**
 * Create a lodging artifact (first-class entity). `tripId` is optional.
 * `tripWellEnterpriseId` defaults from `TRIPWELL_ENTERPRISE_ID` / config when omitted.
 * Requires `title` or `name`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tripId,
      tripWellEnterpriseId,
      title: titleRaw,
      name,
      address,
      website,
      phone,
      googlePlaceId,
      imageUrl,
      rating,
      lat,
      lng,
      chain,
      lodgingType: lodgingTypeRaw,
      amenities: amenitiesRaw,
      nightlyRate: nightlyRateRaw,
      currency,
      streetAddress,
      city,
      state,
      postalCode,
      countryCode,
      defaultCheckInTime,
      defaultCheckOutTime,
    } = body

    const title = (titleRaw ?? name ?? '').trim()
    if (!title) {
      return NextResponse.json(
        { error: 'title or name is required' },
        { status: 400 }
      )
    }

    const lodgingType = parseLodgingType(lodgingTypeRaw)
    if (lodgingTypeRaw !== undefined && lodgingTypeRaw !== null && lodgingType === undefined) {
      return NextResponse.json(
        { error: 'Invalid lodgingType' },
        { status: 400 }
      )
    }

    const amenitiesParsed = parseAmenitiesJson(amenitiesRaw)
    if (amenitiesRaw !== undefined && amenitiesRaw !== null && amenitiesParsed === undefined) {
      return NextResponse.json(
        { error: 'amenities must be a JSON object when provided' },
        { status: 400 }
      )
    }

    const nightlyRate = parseNightlyRate(nightlyRateRaw)
    if (nightlyRateRaw !== undefined && nightlyRateRaw !== null && nightlyRate === undefined) {
      return NextResponse.json(
        { error: 'nightlyRate must be a non-negative number when provided' },
        { status: 400 }
      )
    }

    let currencyNorm: string | null = null
    if (currency !== undefined && currency !== null) {
      const c = String(currency).trim().toUpperCase()
      if (c.length < 2 || c.length > 3) {
        return NextResponse.json(
          { error: 'currency must be a 2–3 letter ISO code when provided' },
          { status: 400 }
        )
      }
      currencyNorm = c
    }

    const lodging = await prisma.lodging.create({
      data: {
        tripId: tripId || null,
        tripWellEnterpriseId: resolveTripWellEnterpriseId(tripWellEnterpriseId),
        title,
        address: address?.trim() || null,
        website: website?.trim() || null,
        phone: phone?.trim() || null,
        googlePlaceId: googlePlaceId?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        rating: typeof rating === 'number' ? rating : null,
        lat: typeof lat === 'number' ? lat : null,
        lng: typeof lng === 'number' ? lng : null,
        chain: chain?.trim() || null,
        lodgingType: lodgingType ?? null,
        amenities: amenitiesParsed ?? undefined,
        nightlyRate: nightlyRate ?? null,
        currency: currencyNorm,
        streetAddress: streetAddress?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        postalCode: postalCode?.trim() || null,
        countryCode: countryCode?.trim()?.toUpperCase() || null,
        defaultCheckInTime: defaultCheckInTime?.trim() || null,
        defaultCheckOutTime: defaultCheckOutTime?.trim() || null,
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
