import type { Prisma } from '@prisma/client'
import { resolveTripWellEnterpriseId } from '@/config/tripWellEnterpriseConfig'
import {
  parseConcertEventWindow,
  parseConcertScheduleItems,
  type ConcertScheduleItemInput,
} from '@/lib/concert-event-window'
import { resolveConcertCityId } from '@/lib/concert-city-resolve'
import { parseIncomingTripDate } from '@/lib/trip-plan-dates'
import {
  daySlotAttractionMetadata,
  daySlotDiningMetadata,
  experienceSpecToMetadata,
  type ParsedDaySlot,
  type ParsedEventAnchor,
  type ParsedExperienceSpec,
} from '@/lib/trip-plan-model'

export type IngestConcertCore = {
  name?: string
  artist?: string | null
  venue?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  url?: string | null
  description?: string | null
  eventDate?: string | null
  eventStartDate?: string | null
  eventStartTime?: string | null
  eventEndDate?: string | null
  eventEndTime?: string | null
  isFestival?: boolean | null
  scheduleItems?: ConcertScheduleItemInput[] | null
}

export type IngestWishlistPoi = {
  kind?: 'attraction' | 'dining' | string
  title?: string
  category?: string | null
  address?: string | null
  description?: string | null
}

export function eventAnchorToConcertCore(
  anchor: ParsedEventAnchor,
  city?: string | null,
  state?: string | null,
  country?: string | null
): IngestConcertCore {
  return {
    name: anchor.name,
    artist: anchor.artist,
    venue: anchor.venue,
    city,
    state,
    country,
    description: anchor.confirmationNotes,
    eventDate: anchor.eventDate,
    eventStartDate: anchor.eventDate,
    eventEndDate: anchor.eventDate,
    isFestival: anchor.kind === 'festival',
  }
}

export function defaultTripDatesFromConcert(concert: IngestConcertCore | null): {
  startDate: string | null
  endDate: string | null
} {
  if (!concert) return { startDate: null, endDate: null }
  const window = parseConcertEventWindow(concert)
  const start = window.eventStartDate
  const end = window.eventEndDate ?? start
  return {
    startDate: start ? start.toISOString().slice(0, 10) : null,
    endDate: end ? end.toISOString().slice(0, 10) : null,
  }
}

export async function createConcertWithSchedule(
  tx: Prisma.TransactionClient,
  params: {
    concert: IngestConcertCore
    cityId: string | null
    createdById?: string | null
  }
): Promise<string> {
  const { concert, cityId, createdById } = params
  const name = typeof concert.name === 'string' ? concert.name.trim() : ''
  if (!name) throw new Error('concert name is required')

  const resolvedCityId =
    cityId ??
    (await resolveConcertCityId({
      city: concert.city,
      state: concert.state,
      country: concert.country,
    }))

  const window = parseConcertEventWindow(concert)
  const scheduleItems = parseConcertScheduleItems(concert.scheduleItems)

  const row = await tx.concert.create({
    data: {
      name,
      artist: concert.artist?.trim() || null,
      venue: concert.venue?.trim() || null,
      cityId: resolvedCityId,
      eventDate: window.eventDate,
      eventStartDate: window.eventStartDate,
      eventStartTime: window.eventStartTime,
      eventEndDate: window.eventEndDate,
      eventEndTime: window.eventEndTime,
      isFestival: window.isFestival,
      url: concert.url?.trim() || null,
      description: concert.description?.trim() || null,
      createdById: createdById?.trim() || null,
      scheduleItems: scheduleItems.length
        ? {
            create: scheduleItems.map((item) => ({
              title: item.title,
              artist: item.artist,
              stage: item.stage,
              location: item.location,
              date: item.date,
              startTime: item.startTime,
              endTime: item.endTime,
              notes: item.notes,
              sortOrder: item.sortOrder,
            })),
          }
        : undefined,
    },
  })

  return row.id
}

export async function attachTripConcertAnchor(
  tx: Prisma.TransactionClient,
  params: {
    tripId: string
    concertId: string
    role?: string | null
    notes?: string | null
  }
): Promise<string> {
  const anchor = await tx.tripConcertAnchor.create({
    data: {
      tripId: params.tripId,
      concertId: params.concertId,
      role: params.role?.trim() || 'primary',
      notes: params.notes?.trim() || null,
      sortOrder: 0,
    },
  })
  return anchor.id
}

export async function seedDestinationFromConcertCity(
  tx: Prisma.TransactionClient,
  params: {
    tripId: string
    cityId: string
    cityName: string | null
    state: string | null
    country: string | null
    venue?: string | null
  }
): Promise<void> {
  const name =
    [params.cityName, params.venue?.trim()].filter(Boolean).join(' — ') ||
    params.cityName ||
    'Destination'

  await tx.destination.create({
    data: {
      tripId: params.tripId,
      cityId: params.cityId,
      name,
      state: params.state,
      country: params.country,
      order: 0,
    },
  })
}

export async function createWishlistAttraction(
  tx: Prisma.TransactionClient,
  params: {
    tripId: string
    cityId: string | null
    title: string
    category?: string | null
    address?: string | null
    description?: string | null
    metadata?: Prisma.InputJsonValue
  }
): Promise<string> {
  const row = await tx.attraction.create({
    data: {
      tripId: params.tripId,
      cityId: params.cityId,
      title: params.title,
      category: params.category?.trim() || null,
      address: params.address?.trim() || null,
      description: params.description?.trim() || null,
      metadata: params.metadata,
      tripWellEnterpriseId: resolveTripWellEnterpriseId(undefined),
    },
  })
  return row.id
}

export async function createWishlistDining(
  tx: Prisma.TransactionClient,
  params: {
    tripId: string
    cityId: string | null
    title: string
    category?: string | null
    address?: string | null
    description?: string | null
    metadata?: Prisma.InputJsonValue
  }
): Promise<string> {
  const row = await tx.dining.create({
    data: {
      tripId: params.tripId,
      cityId: params.cityId,
      title: params.title,
      category: params.category?.trim() || null,
      address: params.address?.trim() || null,
      description: params.description?.trim() || null,
      metadata: params.metadata,
      tripWellEnterpriseId: resolveTripWellEnterpriseId(undefined),
    },
  })
  return row.id
}

export async function ingestWishlistPoiRows(
  tx: Prisma.TransactionClient,
  params: {
    tripId: string
    cityId: string | null
    rows: IngestWishlistPoi[]
  }
): Promise<void> {
  for (const row of params.rows) {
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    if (!title) continue
    const kind = (row.kind ?? 'attraction').toLowerCase()
    if (kind === 'dining') {
      await createWishlistDining(tx, {
        tripId: params.tripId,
        cityId: params.cityId,
        title,
        category: row.category,
        address: row.address,
        description: row.description,
      })
    } else {
      await createWishlistAttraction(tx, {
        tripId: params.tripId,
        cityId: params.cityId,
        title,
        category: row.category,
        address: row.address,
        description: row.description,
      })
    }
  }
}

export async function ingestExperienceSpecsAsWishlist(
  tx: Prisma.TransactionClient,
  params: {
    tripId: string
    cityId: string | null
    experiences: ParsedExperienceSpec[]
  }
): Promise<void> {
  for (const exp of params.experiences) {
    const meta = experienceSpecToMetadata(exp) as Prisma.InputJsonValue
    await createWishlistAttraction(tx, {
      tripId: params.tripId,
      cityId: params.cityId,
      title: exp.name,
      category: exp.experience_type?.trim() || null,
      address: exp.location?.address?.trim() || null,
      description: exp.description?.trim() || null,
      metadata: meta,
    })
  }
}

export async function ingestDaySlotAsWishlist(
  tx: Prisma.TransactionClient,
  params: {
    tripId: string
    cityId: string | null
    slot: ParsedDaySlot
  }
): Promise<void> {
  const { tripId, cityId, slot } = params

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
    await createWishlistDining(tx, {
      tripId,
      cityId,
      title: slot.title,
      category: slot.foodType?.trim() || null,
      address: slot.address?.trim() || null,
      description: slot.description?.trim() || slot.notes?.trim() || null,
      metadata: dmeta,
    })
    return
  }

  const ameta = daySlotAttractionMetadata(slot) as Prisma.InputJsonValue
  await createWishlistAttraction(tx, {
    tripId,
    cityId,
    title: slot.title,
    category: slot.category?.trim() || null,
    address: slot.address?.trim() || null,
    description: slot.description?.trim() || null,
    metadata: ameta,
  })
}

export function parseEventDateForTripDefault(
  eventDate: string | null | undefined
): Date | null {
  if (!eventDate) return null
  try {
    return parseIncomingTripDate(eventDate)
  } catch {
    return null
  }
}
