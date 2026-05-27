import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeTripMetadata } from '@/lib/trip/computeTripMetadata'
import { seedTripDays } from '@/lib/trip/seedTripDays'
import { resolveTripWellEnterpriseId } from '@/config/tripWellEnterpriseConfig'
import { parseLodgingType } from '@/lib/lodging/apiFields'
import {
  daySlotAttractionMetadata,
  daySlotDiningMetadata,
  experienceSpecToMetadata,
  legToLogisticItem,
  normalizeParsedTripPlan,
  planNoteFromExperienceSpec,
  type ParsedDaySlot,
  type ParsedEventAnchor,
  type ParsedExperienceSpec,
  type ParsedLodging,
  type ParsedTripLeg,
} from '@/lib/trip-plan-model'
import {
  resolveTripDayForEventDate,
  resolveTripDayForSlot,
} from '@/lib/trip-plan-ingest'
import { parseIncomingTripDate } from '@/lib/trip-plan-dates'
import {
  TripType,
  TransportMode,
  TripDayExperienceStatus,
  WhoWith,
} from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { enrichCityCatalogIfNeeded } from '@/lib/city-guide-enrich'
import { upsertCityByName } from '@/lib/city-upsert'

export const dynamic = 'force-dynamic'

const WHO_WITH: WhoWith[] = ['SOLO', 'SPOUSE', 'FRIENDS', 'FAMILY', 'OTHER']
const TRANSPORT: TransportMode[] = ['CAR', 'BOAT', 'PLANE']

function normEnum<T extends string>(v: unknown, allowed: T[]): T | null {
  if (typeof v !== 'string') return null
  const u = v.toUpperCase() as T
  return allowed.includes(u) ? u : null
}

async function nextOrderIndex(
  tx: Prisma.TransactionClient,
  tripDayId: string
): Promise<number> {
  const agg = await tx.tripDayExperience.aggregate({
    where: { tripDayId },
    _max: { orderIndex: true },
  })
  return (agg._max.orderIndex ?? -1) + 1
}

async function attachDaySlot(
  tx: Prisma.TransactionClient,
  params: {
    tripId: string
    cityIdForCatalogue: string | null
    tripDays: Array<{ id: string; dayNumber: number; date: Date }>
    tripStart: Date
    slot: ParsedDaySlot
  }
): Promise<void> {
  const { tripId, cityIdForCatalogue, tripDays, tripStart, slot } = params
  const targetDay = resolveTripDayForSlot(tripDays, tripStart, slot)
  if (!targetDay) return

  let orderIndex = await nextOrderIndex(tx, targetDay.id)

  if (slot.type === 'logistic') {
    const detail = [slot.notes, slot.address].filter(Boolean).join('\n').trim()
    await tx.logisticItem.create({
      data: {
        tripId,
        title: slot.title.slice(0, 200),
        detail: detail || null,
      },
    })
    return
  }

  if (slot.type === 'dining') {
    const dmeta = daySlotDiningMetadata(slot) as Prisma.InputJsonValue
    const diningRow = await tx.dining.create({
      data: {
        tripId,
        cityId: cityIdForCatalogue,
        title: slot.title,
        address: slot.address?.trim() || null,
        description: slot.description?.trim() || slot.notes?.trim() || null,
        category: slot.foodType?.trim() || null,
        metadata: dmeta,
        tripWellEnterpriseId: resolveTripWellEnterpriseId(undefined),
      },
    })
    const slotNotes = [slot.foodType, slot.notes].filter(Boolean).join(' · ').trim()
    await tx.tripDayExperience.create({
      data: {
        tripDayId: targetDay.id,
        orderIndex: orderIndex++,
        diningId: diningRow.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        notes: slotNotes || null,
        status: TripDayExperienceStatus.PLANNED,
      },
    })
    return
  }

  const ameta = daySlotAttractionMetadata(slot) as Prisma.InputJsonValue
  const attractionRow = await tx.attraction.create({
    data: {
      tripId,
      cityId: cityIdForCatalogue,
      title: slot.title,
      category: slot.category?.trim() || null,
      address: slot.address?.trim() || null,
      description: slot.description?.trim() || null,
      metadata: ameta,
      tripWellEnterpriseId: resolveTripWellEnterpriseId(undefined),
    },
  })
  await tx.tripDayExperience.create({
    data: {
      tripDayId: targetDay.id,
      orderIndex,
      attractionId: attractionRow.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      notes: slot.notes?.trim() || null,
      status: TripDayExperienceStatus.PLANNED,
    },
  })
}

async function attachEventAnchor(
  tx: Prisma.TransactionClient,
  params: {
    tripId: string
    cityIdForCatalogue: string | null
    tripDays: Array<{ id: string; dayNumber: number; date: Date }>
    anchor: ParsedEventAnchor
  }
): Promise<void> {
  const { tripId, cityIdForCatalogue, tripDays, anchor } = params
  const eventDay = resolveTripDayForEventDate(tripDays, anchor.eventDate)
  if (!eventDay) return

  const eventDate = anchor.eventDate
    ? parseIncomingTripDate(anchor.eventDate)
    : null

  const concert = await tx.concert.create({
    data: {
      name: anchor.name,
      artist: anchor.artist,
      venue: anchor.venue,
      cityId: cityIdForCatalogue,
      eventDate,
      description: anchor.confirmationNotes,
    },
  })

  const orderIndex = await nextOrderIndex(tx, eventDay.id)
  await tx.tripDayExperience.create({
    data: {
      tripDayId: eventDay.id,
      orderIndex,
      concertId: concert.id,
      notes: anchor.ticketStatus,
      status: TripDayExperienceStatus.PLANNED,
    },
  })
}

/**
 * POST /api/traveler/trips/ingest-plan
 * Minimal Trip shell + FK attachments (lodging, concert, destination, logistics, day items).
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

    let start: Date
    let end: Date
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

    const whoWith = normEnum(whoWithRaw, WHO_WITH)
    const transportMode = normEnum(transportModeRaw, TRANSPORT)

    const cityT = typeof city === 'string' ? city.trim() || null : null
    const stateT = typeof state === 'string' ? state.trim() || null : null
    const countryT = typeof country === 'string' ? country.trim() || null : null
    const whereF =
      typeof whereFreeform === 'string' ? whereFreeform.trim() || null : null

    const placeParts = [cityT, stateT, countryT].filter(Boolean).join(', ')
    const whereLine = placeParts || whereF || ''
    let purpose = tripName
    if (whereLine) purpose = `${tripName}. ${whereLine}`

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

    let eventAnchor: ParsedEventAnchor | null = null
    if (eventAnchorRaw && typeof eventAnchorRaw === 'object') {
      eventAnchor =
        normalizeParsedTripPlan({ eventAnchor: eventAnchorRaw }).eventAnchor ?? null
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

      const tripDays = await tx.tripDay.findMany({
        where: { tripId: t.id },
        orderBy: { dayNumber: 'asc' },
      })

      if (cityIdForCatalogue) {
        await tx.destination.create({
          data: {
            tripId: t.id,
            cityId: cityIdForCatalogue,
            name: cityT,
            state: stateT,
            country: countryT,
            order: 0,
          },
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

      if (eventAnchor?.name) {
        await attachEventAnchor(tx, {
          tripId: t.id,
          cityIdForCatalogue,
          tripDays,
          anchor: eventAnchor,
        })
      }

      for (const exp of experiences) {
        const targetDay = tripDays.find((d) => d.dayNumber === 1) ?? tripDays[0]
        if (!targetDay) continue
        let orderIndex = await nextOrderIndex(tx, targetDay.id)
        const meta = experienceSpecToMetadata(exp)
        const attraction = await tx.attraction.create({
          data: {
            tripId: t.id,
            cityId: cityIdForCatalogue,
            title: exp.name,
            category: exp.experience_type?.trim() || null,
            address: exp.location?.address?.trim() || null,
            lat: exp.location?.lat ?? null,
            lng: exp.location?.lng ?? null,
            description: exp.description?.trim() || null,
            metadata: meta as Prisma.InputJsonValue,
            tripWellEnterpriseId: resolveTripWellEnterpriseId(undefined),
          },
        })
        await tx.tripDayExperience.create({
          data: {
            tripDayId: targetDay.id,
            orderIndex,
            attractionId: attraction.id,
            notes: planNoteFromExperienceSpec(exp),
            status: TripDayExperienceStatus.PLANNED,
          },
        })
      }

      for (const slot of daySlots) {
        await attachDaySlot(tx, {
          tripId: t.id,
          cityIdForCatalogue,
          tripDays,
          tripStart: start,
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
        tripDays: {
          orderBy: { dayNumber: 'asc' },
          include: {
            experiences: {
              include: { concert: true, dining: true, attraction: true },
            },
          },
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
