import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeTripMetadata } from '@/lib/trip/computeTripMetadata'
import { seedTripDays } from '@/lib/trip/seedTripDays'
import { resolveTripWellEnterpriseId } from '@/config/tripWellEnterpriseConfig'
import { parseLodgingType } from '@/lib/lodging/apiFields'
import {
  legToLogisticItem,
  normalizeParsedTripPlan,
  type ParsedLodging,
  type ParsedTripLeg,
} from '@/lib/trip-plan-model'
import { TripType, TransportMode, WhoWith } from '@prisma/client'
import { enrichCityCatalogIfNeeded } from '@/lib/city-guide-enrich'

export const dynamic = 'force-dynamic'

const WHO_WITH: WhoWith[] = ['SOLO', 'SPOUSE', 'FRIENDS', 'FAMILY', 'OTHER']
const TRANSPORT: TransportMode[] = ['CAR', 'BOAT', 'PLANE']

function normEnum<T extends string>(v: unknown, allowed: T[]): T | null {
  if (typeof v !== 'string') return null
  const u = v.toUpperCase() as T
  return allowed.includes(u) ? u : null
}

/**
 * POST /api/traveler/trips/ingest-plan
 * Creates Trip + optional Lodging + LogisticItem rows (flights, etc.) in one transaction.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      travelerId,
      tripName: tripNameRaw,
      startDate: startDateRaw,
      endDate: endDateRaw,
      city,
      state,
      country,
      whereFreeform,
      whoWith: whoWithRaw,
      transportMode: transportModeRaw,
      lodging: lodgingRaw,
      legs: legsRaw,
      notes,
      startingLocation: startingLocationRaw,
    } = body as {
      travelerId?: string
      tripName?: string
      startDate?: string
      endDate?: string
      city?: string | null
      state?: string | null
      country?: string | null
      whereFreeform?: string | null
      whoWith?: string | null
      transportMode?: string | null
      lodging?: ParsedLodging | null
      legs?: ParsedTripLeg[] | null
      notes?: string | null
      startingLocation?: string | null
    }

    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const traveler = await prisma.traveler.findUnique({ where: { id: travelerId } })
    if (!traveler) {
      return NextResponse.json({ error: 'Traveler not found' }, { status: 404 })
    }

    const tripName = typeof tripNameRaw === 'string' ? tripNameRaw.trim() : ''
    if (!tripName) {
      return NextResponse.json({ error: 'tripName is required' }, { status: 400 })
    }

    if (!startDateRaw || !endDateRaw) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDateRaw)
    const end = new Date(endDateRaw)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate or endDate' }, { status: 400 })
    }
    if (end.getTime() < start.getTime()) {
      return NextResponse.json(
        { error: 'endDate must be on or after startDate' },
        { status: 400 }
      )
    }

    const whoWith = normEnum(whoWithRaw, WHO_WITH)
    const transportMode = normEnum(transportModeRaw, TRANSPORT)

    const cityT = typeof city === 'string' ? city.trim() || null : null
    const stateT = typeof state === 'string' ? state.trim() || null : null
    const countryT = typeof country === 'string' ? country.trim() || null : null
    const whereF =
      typeof whereFreeform === 'string' ? whereFreeform.trim() || null : null
    const notesT = typeof notes === 'string' ? notes.trim() || null : null

    const placeParts = [cityT, stateT, countryT].filter(Boolean).join(', ')
    const whereLine = placeParts || whereF || ''
    let purpose = whereLine ? `Where: ${whereLine}.` : 'Trip created with your details.'
    if (notesT) {
      purpose = `${purpose} ${notesT}`.trim()
    }
    purpose = `${tripName}. ${purpose}`

    const { daysTotal, season } = computeTripMetadata(start, end)
    const sameCalendarDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate()
    const tripType = sameCalendarDay ? TripType.SINGLE_DAY : TripType.MULTI_DAY

    let lodgingParsed: ParsedLodging | null = null
    if (lodgingRaw && typeof lodgingRaw === 'object') {
      const norm = normalizeParsedTripPlan({ lodging: lodgingRaw })
      lodgingParsed = norm.lodging
    }

    let legs: ParsedTripLeg[] = []
    if (Array.isArray(legsRaw)) {
      const norm = normalizeParsedTripPlan({ legs: legsRaw })
      legs = norm.legs
    }

    const startingLoc =
      typeof startingLocationRaw === 'string' && startingLocationRaw.trim()
        ? startingLocationRaw.trim()
        : traveler.homeAddress ?? null

    const tripId = await prisma.$transaction(async (tx) => {
      const t = await tx.trip.create({
        data: {
          crewId: null,
          travelerId,
          purpose,
          startDate: start,
          endDate: end,
          daysTotal,
          season,
          tripType,
          startingLocation: startingLoc,
          city: cityT,
          state: stateT,
          country: countryT,
          whoWith,
          transportMode,
        },
      })

      await seedTripDays(tx, {
        tripId: t.id,
        startDate: start,
        endDate: end,
      })

      if (lodgingParsed?.title?.trim()) {
        const lt = lodgingParsed.lodgingType
          ? parseLodgingType(lodgingParsed.lodgingType)
          : undefined
        await tx.lodging.create({
          data: {
            tripId: t.id,
            tripWellEnterpriseId: resolveTripWellEnterpriseId(undefined),
            title: lodgingParsed.title.trim(),
            address: lodgingParsed.address?.trim() || null,
            chain: lodgingParsed.chain?.trim() || null,
            lodgingType: lt ?? null,
            defaultCheckInTime: lodgingParsed.defaultCheckInTime?.trim() || null,
            defaultCheckOutTime: lodgingParsed.defaultCheckOutTime?.trim() || null,
          },
        })
      }

      for (const leg of legs) {
        const { title, detail } = legToLogisticItem(leg)
        await tx.logisticItem.create({
          data: {
            tripId: t.id,
            title,
            detail,
          },
        })
      }

      return t.id
    })

    const created = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        lodging: true,
        logistics: { orderBy: { createdAt: 'asc' } },
        tripDays: {
          orderBy: { dayNumber: 'asc' },
          include: { experiences: true },
        },
      },
    })

    if (cityT) {
      void enrichCityCatalogIfNeeded({
        cityName: cityT,
        state: stateT,
        country: countryT ?? 'USA',
      }).catch((e) => console.error('enrichCityCatalogIfNeeded:', e))
    }

    return NextResponse.json({ trip: created, id: tripId }, { status: 201 })
  } catch (error) {
    console.error('ingest-plan error:', error)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}
