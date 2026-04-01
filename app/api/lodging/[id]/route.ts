import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  parseAmenitiesJson,
  parseLodgingType,
  parseNightlyRate,
} from '@/lib/lodging/apiFields'

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

    const existing = await prisma.lodging.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Lodging not found' },
        { status: 404 }
      )
    }

    if (lodgingTypeRaw !== undefined) {
      const lodgingType = parseLodgingType(lodgingTypeRaw)
      if (lodgingTypeRaw !== null && lodgingType === undefined) {
        return NextResponse.json(
          { error: 'Invalid lodgingType' },
          { status: 400 }
        )
      }
    }

    if (amenitiesRaw !== undefined) {
      const amenitiesParsed = parseAmenitiesJson(amenitiesRaw)
      if (amenitiesRaw !== null && amenitiesParsed === undefined) {
        return NextResponse.json(
          { error: 'amenities must be a JSON object when provided' },
          { status: 400 }
        )
      }
    }

    if (nightlyRateRaw !== undefined) {
      const nightlyRate = parseNightlyRate(nightlyRateRaw)
      if (nightlyRateRaw !== null && nightlyRate === undefined) {
        return NextResponse.json(
          { error: 'nightlyRate must be a non-negative number when provided' },
          { status: 400 }
        )
      }
    }

    if (currency !== undefined && currency !== null) {
      const c = String(currency).trim().toUpperCase()
      if (c.length < 2 || c.length > 3) {
        return NextResponse.json(
          { error: 'currency must be a 2–3 letter ISO code when provided' },
          { status: 400 }
        )
      }
    }

    const data: Prisma.LodgingUpdateInput = {}

    if (title !== undefined || name !== undefined) {
      const next = (title ?? name ?? '').trim()
      if (!next) {
        return NextResponse.json(
          { error: 'title cannot be empty' },
          { status: 400 }
        )
      }
      data.title = next
    }

    if (address !== undefined) data.address = address?.trim() || null
    if (website !== undefined) data.website = website?.trim() || null
    if (phone !== undefined) data.phone = phone?.trim() || null
    if (googlePlaceId !== undefined)
      data.googlePlaceId = googlePlaceId?.trim() || null
    if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() || null
    if (rating !== undefined) data.rating = typeof rating === 'number' ? rating : null
    if (lat !== undefined) data.lat = typeof lat === 'number' ? lat : null
    if (lng !== undefined) data.lng = typeof lng === 'number' ? lng : null
    if (chain !== undefined) data.chain = chain?.trim() || null

    if (lodgingTypeRaw !== undefined) {
      const lodgingType = parseLodgingType(lodgingTypeRaw)
      data.lodgingType = lodgingType ?? null
    }

    if (amenitiesRaw !== undefined) {
      if (amenitiesRaw === null) {
        data.amenities = Prisma.DbNull
      } else {
        const amenitiesParsed = parseAmenitiesJson(amenitiesRaw)
        data.amenities = amenitiesParsed as Prisma.InputJsonValue
      }
    }

    if (nightlyRateRaw !== undefined) {
      const nightlyRate = parseNightlyRate(nightlyRateRaw)
      data.nightlyRate = nightlyRate === undefined ? undefined : nightlyRate
    }

    if (currency !== undefined) {
      data.currency =
        currency === null ? null : String(currency).trim().toUpperCase() || null
    }
    if (streetAddress !== undefined)
      data.streetAddress = streetAddress?.trim() || null
    if (city !== undefined) data.city = city?.trim() || null
    if (state !== undefined) data.state = state?.trim() || null
    if (postalCode !== undefined) data.postalCode = postalCode?.trim() || null
    if (countryCode !== undefined) {
      data.countryCode = countryCode?.trim()?.toUpperCase() || null
    }
    if (defaultCheckInTime !== undefined) {
      data.defaultCheckInTime = defaultCheckInTime?.trim() || null
    }
    if (defaultCheckOutTime !== undefined) {
      data.defaultCheckOutTime = defaultCheckOutTime?.trim() || null
    }

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
