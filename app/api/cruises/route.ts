import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { upsertCityByName } from '@/lib/city-upsert'
import { wishlistIdForTraveler } from '@/lib/traveler-build-scope'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cruises?travelerId= — saved-by, wishlist, or authored by this traveler.
 * GET /api/cruises?savedByTravelerId= — rows with that savedByTravelerId only.
 * GET /api/cruises?createdById= — cruises authored by that traveller.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const travelerId = searchParams.get('travelerId')?.trim()
    const savedByTravelerId = searchParams.get('savedByTravelerId')?.trim()
    const createdById = searchParams.get('createdById')?.trim()

    if (travelerId) {
      const wId = await wishlistIdForTraveler(travelerId)
      const cruises = await prisma.cruise.findMany({
        where: {
          OR: [
            { savedByTravelerId: travelerId },
            { createdById: travelerId },
            ...(wId ? [{ wishlistId: wId }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: { city: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
      })
      return NextResponse.json({ cruises })
    }

    if (!savedByTravelerId && !createdById) {
      return NextResponse.json(
        { error: 'travelerId, savedByTravelerId, or createdById is required' },
        { status: 400 }
      )
    }
    const cruises = await prisma.cruise.findMany({
      where: savedByTravelerId
        ? { savedByTravelerId }
        : { createdById: createdById! },
      orderBy: { createdAt: 'desc' },
      include: { city: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
    })
    return NextResponse.json({ cruises })
  } catch (error) {
    console.error('Cruise list error:', error)
    return NextResponse.json({ error: 'Failed to list cruises' }, { status: 500 })
  }
}

/**
 * POST /api/cruises
 * Create a catalogue cruise. Optional city via catalogCityName + catalogCityState + country (like hikes).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      name,
      shipName,
      cruiseLine,
      departingFrom,
      baseCostPerRoom,
      baseCostPerGuest,
      currency,
      amenities,
      onboardEntertainmentSummary,
      url,
      notes,
      catalogCityName,
      catalogCityState,
      country = 'USA',
      createdById,
    } = body as Record<string, unknown>

    const title = typeof name === 'string' ? name.trim() : ''
    if (!title) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    let cityId: string | null = null
    let city: Awaited<ReturnType<typeof upsertCityByName>> | null = null

    const cityNameRaw =
      typeof catalogCityName === 'string' && catalogCityName.trim() ? catalogCityName.trim() : ''

    if (cityNameRaw) {
      const stateVal =
        typeof catalogCityState === 'string' && catalogCityState.trim()
          ? catalogCityState.trim()
          : null
      const countryStr =
        typeof country === 'string' && country.trim() ? country.trim() : 'USA'
      city = await upsertCityByName({
        name: cityNameRaw,
        state: stateVal,
        country: countryStr,
      })
      cityId = city.id
    }

    const authorId =
      typeof createdById === 'string' && createdById.trim() ? createdById.trim() : null

    const cruise = await prisma.cruise.create({
      data: {
        name: title,
        createdById: authorId,
        shipName:
          typeof shipName === 'string' && shipName.trim() ? shipName.trim() : null,
        cruiseLine:
          typeof cruiseLine === 'string' && cruiseLine.trim() ? cruiseLine.trim() : null,
        departingFrom:
          typeof departingFrom === 'string' && departingFrom.trim()
            ? departingFrom.trim()
            : null,
        cityId,
        baseCostPerRoom:
          typeof baseCostPerRoom === 'number' && Number.isFinite(baseCostPerRoom)
            ? baseCostPerRoom
            : null,
        baseCostPerGuest:
          typeof baseCostPerGuest === 'number' && Number.isFinite(baseCostPerGuest)
            ? baseCostPerGuest
            : null,
        currency:
          typeof currency === 'string' && currency.trim() ? currency.trim() : 'USD',
        amenities:
          typeof amenities === 'string' && amenities.trim() ? amenities.trim() : null,
        onboardEntertainmentSummary:
          typeof onboardEntertainmentSummary === 'string' &&
          onboardEntertainmentSummary.trim()
            ? onboardEntertainmentSummary.trim()
            : null,
        url: typeof url === 'string' && url.trim() ? url.trim() : null,
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      },
      include: {
        city: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ city, cruise }, { status: 201 })
  } catch (error) {
    console.error('Cruise create error:', error)
    return NextResponse.json({ error: 'Failed to create cruise' }, { status: 500 })
  }
}
