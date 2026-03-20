import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { upsertCityByName } from '@/lib/city-upsert'
import { HIKE_ROUTE_TYPES, type HikeRouteType } from '@/lib/hike-model'

export const dynamic = 'force-dynamic'

function validRouteType(v: unknown): HikeRouteType | null {
  if (typeof v !== 'string') return null
  const s = v.trim() as HikeRouteType
  return HIKE_ROUTE_TYPES.includes(s) ? s : null
}

/**
 * POST /api/hikes
 * Create a catalogue hike (City upsert + Hike). Body matches parsed shape + optional overrides.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      name,
      trailOrPlace,
      difficulty,
      distanceMi,
      durationMin,
      routeType,
      trailheadLat,
      trailheadLng,
      nearestTown,
      nearestState,
      country = 'USA',
      url,
      notes,
      sourcePaste,
      catalogCityName,
      catalogCityState,
    } = body as Record<string, unknown>

    const title = typeof name === 'string' ? name.trim() : ''
    if (!title) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const cityFromBody =
      typeof catalogCityName === 'string' && catalogCityName.trim()
        ? catalogCityName.trim()
        : typeof nearestTown === 'string' && nearestTown.trim()
          ? nearestTown.trim()
          : ''

    if (!cityFromBody) {
      return NextResponse.json(
        {
          error:
            'nearestTown or catalogCityName is required so the hike can be linked to a catalogue city.',
        },
        { status: 400 }
      )
    }

    const stateVal =
      typeof catalogCityState === 'string' && catalogCityState.trim()
        ? catalogCityState.trim()
        : typeof nearestState === 'string' && nearestState.trim()
          ? nearestState.trim()
          : null

    const countryStr =
      typeof country === 'string' && country.trim() ? country.trim() : 'USA'

    const city = await upsertCityByName({
      name: cityFromBody,
      state: stateVal,
      country: countryStr,
    })

    const rt = validRouteType(routeType)

    const hike = await prisma.hike.create({
      data: {
        name: title,
        trailOrPlace:
          typeof trailOrPlace === 'string' && trailOrPlace.trim()
            ? trailOrPlace.trim()
            : null,
        difficulty:
          typeof difficulty === 'string' && difficulty.trim()
            ? difficulty.trim()
            : null,
        distanceMi:
          typeof distanceMi === 'number' && Number.isFinite(distanceMi)
            ? distanceMi
            : null,
        durationMin:
          typeof durationMin === 'number' && Number.isFinite(durationMin)
            ? Math.round(durationMin)
            : null,
        routeType: rt,
        trailheadLat:
          typeof trailheadLat === 'number' && Number.isFinite(trailheadLat)
            ? trailheadLat
            : null,
        trailheadLng:
          typeof trailheadLng === 'number' && Number.isFinite(trailheadLng)
            ? trailheadLng
            : null,
        nearestTown:
          typeof nearestTown === 'string' && nearestTown.trim()
            ? nearestTown.trim()
            : null,
        sourcePaste:
          typeof sourcePaste === 'string' && sourcePaste.trim()
            ? sourcePaste.trim()
            : null,
        url: typeof url === 'string' && url.trim() ? url.trim() : null,
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
        cityId: city.id,
      },
      include: { city: true },
    })

    return NextResponse.json({ city, hike }, { status: 201 })
  } catch (error) {
    console.error('Hike create error:', error)
    return NextResponse.json(
      { error: 'Failed to create hike' },
      { status: 500 }
    )
  }
}
