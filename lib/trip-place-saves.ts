import { prisma } from '@/lib/prisma'

export async function saveDiningToTrip(tripId: string, diningId: string) {
  return prisma.tripDiningSave.upsert({
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
}

export async function saveAttractionToTrip(tripId: string, attractionId: string) {
  return prisma.tripAttractionSave.upsert({
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
}
