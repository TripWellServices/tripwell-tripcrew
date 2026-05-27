import type { Prisma } from '@prisma/client'

/** UTC calendar day at noon — matches parseIncomingTripDate / ingest-plan. */
function utcNoonFromDate(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0)
  )
}

/**
 * One TripDay per calendar day from startDate through endDate (inclusive).
 */
export async function seedTripDays(
  tx: Prisma.TransactionClient,
  params: {
    tripId: string
    startDate: Date
    endDate: Date
  }
): Promise<void> {
  const start = utcNoonFromDate(params.startDate)
  const end = utcNoonFromDate(params.endDate)
  let dayNumber = 1
  const cursor = new Date(start)
  while (cursor.getTime() <= end.getTime()) {
    await tx.tripDay.create({
      data: {
        tripId: params.tripId,
        date: new Date(cursor),
        dayNumber,
      },
    })
    dayNumber += 1
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
}
