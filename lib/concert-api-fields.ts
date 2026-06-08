import {
  parseConcertEventWindow,
  parseConcertScheduleItems,
  type ConcertEventWindowInput,
  type ConcertScheduleItemInput,
} from '@/lib/concert-event-window'
import { resolveConcertCityId } from '@/lib/concert-city-resolve'
import type { Prisma } from '@prisma/client'

export type ConcertCoreBody = {
  name?: string
  artist?: string | null
  venue?: string | null
  cityId?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  url?: string | null
  imageUrl?: string | null
  description?: string | null
  createdById?: string | null
  scheduleItems?: ConcertScheduleItemInput[] | null
} & ConcertEventWindowInput

export async function resolveConcertCreateData(
  body: ConcertCoreBody
): Promise<{
  data: Prisma.ConcertUncheckedCreateInput
  scheduleItems: ReturnType<typeof parseConcertScheduleItems>
} | { error: string; status: number }> {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return { error: 'Name is required', status: 400 }
  }

  const resolvedCityId = await resolveConcertCityId({
    cityId: body.cityId,
    city: body.city,
    state: body.state,
    country: body.country,
  })
  if (body.cityId?.trim() && !resolvedCityId) {
    return { error: 'City not found', status: 404 }
  }

  const window = parseConcertEventWindow(body)
  const scheduleItems = parseConcertScheduleItems(body.scheduleItems)

  return {
    data: {
      name,
      artist: body.artist?.trim() || null,
      venue: body.venue?.trim() || null,
      cityId: resolvedCityId,
      eventDate: window.eventDate,
      eventStartDate: window.eventStartDate,
      eventStartTime: window.eventStartTime,
      eventEndDate: window.eventEndDate,
      eventEndTime: window.eventEndTime,
      isFestival: window.isFestival,
      url: body.url?.trim() || null,
      imageUrl: body.imageUrl?.trim() || null,
      description: body.description?.trim() || null,
      createdById: body.createdById?.trim() || null,
    },
    scheduleItems,
  }
}

export function concertPatchData(
  body: ConcertCoreBody,
  existing: {
    name: string
    artist: string | null
    venue: string | null
    cityId: string | null
    eventDate: Date | null
    eventStartDate: Date | null
    eventStartTime: string | null
    eventEndDate: Date | null
    eventEndTime: string | null
    isFestival: boolean
    url: string | null
    imageUrl: string | null
    description: string | null
  }
): Prisma.ConcertUpdateInput {
  const data: Prisma.ConcertUpdateInput = {}
  if (body.name !== undefined) data.name = body.name?.trim() ?? existing.name
  if (body.artist !== undefined) data.artist = body.artist?.trim() || null
  if (body.venue !== undefined) data.venue = body.venue?.trim() || null
  if (body.url !== undefined) data.url = body.url?.trim() || null
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl?.trim() || null
  if (body.description !== undefined) data.description = body.description?.trim() || null

  const hasWindowField =
    body.eventDate !== undefined ||
    body.eventStartDate !== undefined ||
    body.eventStartTime !== undefined ||
    body.eventEndDate !== undefined ||
    body.eventEndTime !== undefined ||
    body.isFestival !== undefined

  if (hasWindowField) {
    const window = parseConcertEventWindow({
      eventDate: body.eventDate ?? existing.eventDate?.toISOString() ?? null,
      eventStartDate:
        body.eventStartDate ?? existing.eventStartDate?.toISOString() ?? null,
      eventStartTime: body.eventStartTime ?? existing.eventStartTime,
      eventEndDate: body.eventEndDate ?? existing.eventEndDate?.toISOString() ?? null,
      eventEndTime: body.eventEndTime ?? existing.eventEndTime,
      isFestival: body.isFestival ?? existing.isFestival,
    })
    data.eventDate = window.eventDate
    data.eventStartDate = window.eventStartDate
    data.eventStartTime = window.eventStartTime
    data.eventEndDate = window.eventEndDate
    data.eventEndTime = window.eventEndTime
    data.isFestival = window.isFestival
  }

  return data
}
