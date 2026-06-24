import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import {
  fetchThingsToDoSuggestions,
  stubThingsToDoSuggestions,
  type ThingsToDoSuggestionFilters,
} from '@/lib/trip-poi-suggestions'

export const dynamic = 'force-dynamic'

function dateLabel(d: Date | null | undefined): string | null {
  if (!d) return null
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString().slice(0, 10)
}

/**
 * POST /api/trip/[tripId]/poi-suggestions
 * Trip-scoped AI Things To Do suggestions (Must Dos, Dining, Experiences).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}))
    const { travelerId, filters: filtersRaw } = body as {
      travelerId?: string
      filters?: ThingsToDoSuggestionFilters
    }

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(params.tripId, travelerId.trim())
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const trip = await prisma.trip.findUnique({
      where: { id: params.tripId },
      include: {
        lodging: true,
        concertAnchors: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          include: { concert: true },
        },
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const concert = trip.concertAnchors[0]?.concert ?? null
    const filters: ThingsToDoSuggestionFilters =
      filtersRaw && typeof filtersRaw === 'object' ? filtersRaw : {}

    const suggestions =
      (await fetchThingsToDoSuggestions({
        tripTitle: trip.title,
        purpose: trip.purpose,
        city: trip.city,
        state: trip.state,
        country: trip.country,
        season: trip.season,
        startDate: dateLabel(trip.startDate),
        endDate: dateLabel(trip.endDate),
        whoWith: trip.whoWith,
        concertName: concert?.name,
        concertVenue: concert?.venue,
        concertDescription: concert?.description,
        lodgingTitle: trip.lodging?.title,
        lodgingAddress: trip.lodging?.address,
        lodgingLat: trip.lodging?.lat,
        lodgingLng: trip.lodging?.lng,
        filters,
      })) ??
      stubThingsToDoSuggestions(trip.city?.trim() || 'your destination')

    if (filters.mustDos === false) suggestions.mustDos = []
    if (filters.dining === false) suggestions.dining = []
    if (filters.experiences === false) suggestions.experiences = []

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('POI suggestions error:', error)
    return NextResponse.json({ error: 'Failed to get suggestions' }, { status: 500 })
  }
}
