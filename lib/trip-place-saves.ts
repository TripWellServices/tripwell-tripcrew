import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type TripPlaceSaveClient = typeof prisma | Prisma.TransactionClient

export function isTripPlaceSaveSchemaUnavailable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022')
  )
}

export async function saveDiningToTrip(
  tripId: string,
  diningId: string,
  client: TripPlaceSaveClient = prisma
) {
  try {
    return await client.tripDiningSave.upsert({
      where: {
        tripId_diningId: {
          tripId,
          diningId,
        },
      },
      update: {},
      create: {
        tripId,
        diningId,
      },
    })
  } catch (error) {
    if (!isTripPlaceSaveSchemaUnavailable(error)) throw error
    console.warn('Trip dining save join table unavailable; falling back to Dining.tripId', error)
    return client.dining.update({
      where: { id: diningId },
      data: { tripId },
    })
  }
}

export async function saveAttractionToTrip(
  tripId: string,
  attractionId: string,
  client: TripPlaceSaveClient = prisma
) {
  try {
    return await client.tripAttractionSave.upsert({
      where: {
        tripId_attractionId: {
          tripId,
          attractionId,
        },
      },
      update: {},
      create: {
        tripId,
        attractionId,
      },
    })
  } catch (error) {
    if (!isTripPlaceSaveSchemaUnavailable(error)) throw error
    console.warn(
      'Trip attraction save join table unavailable; falling back to Attraction.tripId',
      error
    )
    return client.attraction.update({
      where: { id: attractionId },
      data: { tripId },
    })
  }
}
