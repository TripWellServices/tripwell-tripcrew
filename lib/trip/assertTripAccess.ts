import { prisma } from '@/lib/prisma'

export type TripForAccess = {
  id: string
  crewId: string | null
  travelerId: string | null
  purpose: string
  city: string | null
  state: string | null
  country: string | null
  startDate: Date
}

export type TripAccessOk = {
  ok: true
  trip: TripForAccess
  ownsTrip: boolean
  memberOfTripCrew: boolean
}

export type TripAccessDenied = {
  ok: false
  status: 403 | 404
  message: string
}

export type TripAccessResult = TripAccessOk | TripAccessDenied

/**
 * Same rules as PATCH /api/trip/[tripId]: trip owner or member of the trip's TripCrew may access.
 */
export async function getTripAccess(
  tripId: string,
  travelerId: string
): Promise<TripAccessResult> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      crewId: true,
      travelerId: true,
      purpose: true,
      city: true,
      state: true,
      country: true,
      startDate: true,
    },
  })

  if (!trip) {
    return { ok: false, status: 404, message: 'Trip not found' }
  }

  const ownsTrip = trip.travelerId === travelerId
  let memberOfTripCrew = false
  if (trip.crewId) {
    const m = await prisma.tripCrewMember.findFirst({
      where: { tripCrewId: trip.crewId, travelerId },
    })
    memberOfTripCrew = Boolean(m)
  }

  if (!ownsTrip && !memberOfTripCrew) {
    return { ok: false, status: 403, message: 'Not allowed to access this trip' }
  }

  return { ok: true, trip, ownsTrip, memberOfTripCrew }
}
