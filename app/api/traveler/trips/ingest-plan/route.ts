import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeTripMetadata } from '@/lib/trip/computeTripMetadata'
import { seedTripDays } from '@/lib/trip/seedTripDays'
import { resolveTripWellEnterpriseId } from '@/config/tripWellEnterpriseConfig'
import { parseLodgingType } from '@/lib/lodging/apiFields'
import {
  legToLogisticItem,
  normalizeParsedTripPlan,
  type ParsedDaySlot,
  type ParsedEventAnchor,
  type ParsedExperienceSpec,
  type ParsedLodging,
  type ParsedTripLeg,
} from '@/lib/trip-plan-model'
import { parseIncomingTripDate } from '@/lib/trip-plan-dates'
import { TripType, TransportMode, WhoWith } from '@prisma/client'
import { enrichCityCatalogIfNeeded } from '@/lib/city-guide-enrich'
import { upsertCityByName } from '@/lib/city-upsert'
import {
  attachTripConcertAnchor,
  createConcertWithSchedule,
  defaultTripDatesFromConcert,
  eventAnchorToConcertCore,
  ingestDaySlotAsWishlist,
  ingestExperienceSpecsAsWishlist,
  ingestWishlistPoiRows,
  seedDestinationFromConcertCity,
  type IngestConcertCore,
  type IngestWishlistPoi,
} from '@/lib/concert-trip-ingest'
import {
  parseConcertEventWindow,
  type ConcertScheduleItemInput,
} from '@/lib/concert-event-window'

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
 * Concert-first ingest: Trip shell + FK anchors (no TripDayExperience placement in Pass 2).
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
      experiences: experiencesRaw,
      daySlots: daySlotsRaw,
      eventAnchor: eventAnchorRaw,
      concert: concertRaw,
      scheduleItems: scheduleItemsRaw,
      wishlistPoi: wishlistPoiRaw,
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
      experiences?: unknown[] | null
      daySlots?: unknown[] | null
      eventAnchor?: ParsedEventAnchor | null
      concert?: IngestConcertCore | null
      scheduleItems?: unknown[] | null
      wishlistPoi?: IngestWishlistPoi[] | null
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

    let eventAnchor: ParsedEventAnchor | null = null
    if (eventAnchorRaw && typeof eventAnchorRaw === 'object') {
      eventAnchor =
        normalizeParsedTripPlan({ eventAnchor: eventAnchorRaw }).eventAnchor ?? null
    }

    let concertCore: IngestConcertCore | null = null
    if (concertRaw && typeof concertRaw === 'object') {
      const scheduleFromBody = Array.isArray(scheduleItemsRaw)
        ? (scheduleItemsRaw as ConcertScheduleItemInput[])
        : null
      concertCore = {
        ...concertRaw,
        scheduleItems: concertRaw.scheduleItems ?? scheduleFromBody,
      }
    } else if (eventAnchor?.name) {
      concertCore = eventAnchorToConcertCore(eventAnchor, city, state, country)
    }

    const concertDefaults = defaultTripDatesFromConcert(concertCore)

    let start: Date
    let end: Date
    if (startDateRaw && endDateRaw) {
      try {
        start = parseIncomingTripDate(startDateRaw)
        end = parseIncomingTripDate(endDateRaw)
      } catch {
        return NextResponse.json({ error: 'Invalid startDate or endDate' }, { status: 400 })
      }
      if (end.getTime() < start.getTime()) {
        return NextResponse.json(
          { error: 'endDate must be on or after startDate' },
          { status: 400 }
        )
      }
    } else if (startDateRaw) {
      try {
        start = parseIncomingTripDate(startDateRaw)
      } catch {
        return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 })
      }
      end = new Date(start)
      end.setUTCDate(end.getUTCDate() + 7)
    } else if (endDateRaw) {
      try {
        end = parseIncomingTripDate(endDateRaw)
      } catch {
        return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 })
      }
      start = new Date(end)
      start.setUTCDate(start.getUTCDate() - 7)
      if (start.getTime() > end.getTime()) start = new Date(end)
    } else if (concertCore) {
      const window = parseConcertEventWindow(concertCore)
      if (window.eventStartDate) {
        start = window.eventStartDate
        end = window.eventEndDate ?? window.eventStartDate
      } else if (concertDefaults.startDate) {
        start = parseIncomingTripDate(concertDefaults.startDate)
        end = concertDefaults.endDate
          ? parseIncomingTripDate(concertDefaults.endDate)
          : new Date(start)
      } else {
        start = new Date()
        end = new Date()
        end.setUTCDate(end.getUTCDate() + 7)
      }
    } else if (eventAnchor?.eventDate) {
      try {
        start = parseIncomingTripDate(eventAnchor.eventDate)
        end = new Date(start)
      } catch {
        start = new Date()
        end = new Date()
        end.setUTCDate(end.getUTCDate() + 7)
      }
    } else {
      start = new Date()
      end = new Date()
      end.setUTCDate(end.getUTCDate() + 7)
    }

    const whoWith = normEnum(whoWithRaw, WHO_WITH)
    const transportMode = normEnum(transportModeRaw, TRANSPORT)

    const cityT =
      (typeof concertCore?.city === 'string' ? concertCore.city.trim() : null) ||
      (typeof city === 'string' ? city.trim() || null : null)
    const stateT =
      (typeof concertCore?.state === 'string' ? concertCore.state.trim() : null) ||
      (typeof state === 'string' ? state.trim() || null : null)
    const countryT =
      (typeof concertCore?.country === 'string' ? concertCore.country.trim() : null) ||
      (typeof country === 'string' ? country.trim() || null : null)
    const whereF =
      typeof whereFreeform === 'string' ? whereFreeform.trim() || null : null

    const placeParts = [cityT, stateT, countryT].filter(Boolean).join(', ')
    const title = tripName
    const purposeParts: string[] = []
    if (notes?.trim()) purposeParts.push(notes.trim())
    else if (concertCore?.description?.trim()) purposeParts.push(concertCore.description.trim())
    const purpose = purposeParts.join('. ')

    const { daysTotal, season } = computeTripMetadata(start, end)
    const sameCalendarDay =
      start.getUTCFullYear() === end.getUTCFullYear() &&
      start.getUTCMonth() === end.getUTCMonth() &&
      start.getUTCDate() === end.getUTCDate()
    const tripType = sameCalendarDay ? TripType.SINGLE_DAY : TripType.MULTI_DAY

    let lodgingParsed: ParsedLodging | null = null
    if (lodgingRaw && typeof lodgingRaw === 'object') {
      lodgingParsed = normalizeParsedTripPlan({ lodging: lodgingRaw }).lodging
    }

    let legs: ParsedTripLeg[] = []
    if (Array.isArray(legsRaw)) {
      legs = normalizeParsedTripPlan({ legs: legsRaw }).legs
    }

    let experiences: ParsedExperienceSpec[] = []
    if (Array.isArray(experiencesRaw)) {
      experiences = normalizeParsedTripPlan({ experiences: experiencesRaw }).experiences
    }

    let daySlots: ParsedDaySlot[] = []
    if (Array.isArray(daySlotsRaw)) {
      daySlots = normalizeParsedTripPlan({ daySlots: daySlotsRaw }).daySlots
    }

    let wishlistPoi: IngestWishlistPoi[] = []
    if (Array.isArray(wishlistPoiRaw)) {
      wishlistPoi = wishlistPoiRaw.filter(
        (row) => row && typeof row === 'object' && typeof row.title === 'string'
      )
    }

    let cityIdForCatalogue: string | null = null
    if (cityT) {
      try {
        const cityRow = await upsertCityByName({
          name: cityT,
          state: stateT,
          country: countryT ?? 'USA',
        })
        cityIdForCatalogue = cityRow.id
      } catch (e) {
        console.error('ingest-plan upsertCityByName:', e)
      }
    }

    const startingLoc =
      typeof startingLocationRaw === 'string' && startingLocationRaw.trim()
        ? startingLocationRaw.trim()
        : traveler.homeAddress ?? null

    let savedConcertId: string | null = null
    let savedAnchorId: string | null = null

    const tripId = await prisma.$transaction(async (tx) => {
      const t = await tx.trip.create({
        data: {
          crewId: null,
          travelerId,
          title,
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

      if (cityIdForCatalogue) {
        await seedDestinationFromConcertCity(tx, {
          tripId: t.id,
          cityId: cityIdForCatalogue,
          cityName: cityT,
          state: stateT,
          country: countryT,
          venue: concertCore?.venue ?? eventAnchor?.venue ?? null,
        })
      }

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
          data: { tripId: t.id, title, detail },
        })
      }

      if (concertCore?.name) {
        const concertId = await createConcertWithSchedule(tx, {
          concert: concertCore,
          cityId: cityIdForCatalogue,
          createdById: travelerId,
        })
        savedConcertId = concertId
        savedAnchorId = await attachTripConcertAnchor(tx, {
          tripId: t.id,
          concertId,
          role: concertCore.isFestival ? 'festival' : 'primary',
          notes: eventAnchor?.ticketStatus ?? null,
        })
      }

      if (wishlistPoi.length) {
        await ingestWishlistPoiRows(tx, {
          tripId: t.id,
          cityId: cityIdForCatalogue,
          rows: wishlistPoi,
        })
      }

      if (experiences.length) {
        await ingestExperienceSpecsAsWishlist(tx, {
          tripId: t.id,
          cityId: cityIdForCatalogue,
          experiences,
        })
      }

      for (const slot of daySlots) {
        await ingestDaySlotAsWishlist(tx, {
          tripId: t.id,
          cityId: cityIdForCatalogue,
          slot,
        })
      }

      return t.id
    })

    const created = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        lodging: true,
        logistics: { orderBy: { createdAt: 'asc' } },
        destinations: { include: { city: true } },
        concertAnchors: {
          orderBy: { sortOrder: 'asc' },
          include: {
            concert: {
              include: {
                city: true,
                scheduleItems: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
        attractions: true,
        dining: true,
        tripDays: { orderBy: { dayNumber: 'asc' } },
      },
    })

    if (cityT) {
      void enrichCityCatalogIfNeeded({
        cityName: cityT,
        state: stateT,
        country: countryT ?? 'USA',
      }).catch((e) => console.error('enrichCityCatalogIfNeeded:', e))
    }

    return NextResponse.json(
      {
        trip: created,
        id: tripId,
        tripId,
        concertId: savedConcertId,
        anchorId: savedAnchorId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('ingest-plan error:', error)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}
