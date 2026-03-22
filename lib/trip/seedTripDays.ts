import type { Prisma } from '@prisma/client'

/**
 * One TripDay per calendar day from startDate through endDate (inclusive).
 */
export async function seedTripDays(
  tx: Prisma.TransactionClient,
  params: {
    tripId: string
    startDate: Date
    endDate: Date
    dayStartTime?: string | null
    dayEndTime?: string | null
  }
): Promise<void> {
  const start = new Date(params.startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(params.endDate)
  end.setHours(0, 0, 0, 0)
  let dayNumber = 1
  const cursor = new Date(start)
  while (cursor.getTime() <= end.getTime()) {
    await tx.tripDay.create({
      data: {
        tripId: params.tripId,
        date: new Date(cursor),
        dayNumber,
        dayStartTime: params.dayStartTime ?? null,
        dayEndTime: params.dayEndTime ?? null,
      },
    })
    dayNumber += 1
    cursor.setDate(cursor.getDate() + 1)
  }
}
