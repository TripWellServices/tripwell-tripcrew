import type { Prisma } from '@prisma/client'
import { TripDayExperienceStatus } from '@prisma/client'
import type { ParsedDaySlot } from '@/lib/trip-plan-model'
import {
  resolveTripDayForEventDate,
  resolveTripDayForSlot,
} from '@/lib/trip-plan-ingest'

type TripDayPick = { id: string; dayNumber: number; date: Date | string }

async function nextOrderIndex(
  tx: Prisma.TransactionClient,
  tripDayId: string
): Promise<number> {
  const maxOrder = await tx.tripDayExperience.aggregate({
    where: { tripDayId },
    _max: { orderIndex: true },
  })
  return (maxOrder._max.orderIndex ?? -1) + 1
}

export async function scheduleConcertOnTripDay(
  tx: Prisma.TransactionClient,
  params: {
    concertId: string
    tripDays: TripDayPick[]
    eventDateYmd: string | null | undefined
    startTime?: string | null
    endTime?: string | null
  }
): Promise<void> {
  const day = resolveTripDayForEventDate(params.tripDays, params.eventDateYmd)
  if (!day) return

  const orderIndex = await nextOrderIndex(tx, day.id)
  await tx.tripDayExperience.create({
    data: {
      tripDayId: day.id,
      concertId: params.concertId,
      orderIndex,
      startTime: params.startTime?.trim() || null,
      endTime: params.endTime?.trim() || null,
      status: TripDayExperienceStatus.PLANNED,
    },
  })
}

export async function scheduleDaySlotOnTripDay(
  tx: Prisma.TransactionClient,
  params: {
    tripDays: TripDayPick[]
    tripStart: Date
    slot: ParsedDaySlot
    diningId?: string
    attractionId?: string
  }
): Promise<void> {
  if (!params.diningId && !params.attractionId) return

  const day = resolveTripDayForSlot(params.tripDays, params.tripStart, params.slot)
  if (!day) return

  const orderIndex = await nextOrderIndex(tx, day.id)
  await tx.tripDayExperience.create({
    data: {
      tripDayId: day.id,
      diningId: params.diningId ?? null,
      attractionId: params.attractionId ?? null,
      orderIndex,
      startTime: params.slot.startTime?.trim() || null,
      endTime: params.slot.endTime?.trim() || null,
      notes: params.slot.notes?.trim() || null,
      status: TripDayExperienceStatus.PLANNED,
    },
  })
}
