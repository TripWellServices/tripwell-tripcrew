import type { TripSetupOrigin } from '@prisma/client'
import { inferConcertTripTitle } from '@/lib/trip/inferTripTitle'

export type TripSetupContext = {
  setupOrigin: TripSetupOrigin
  isConcertTrip: boolean
  showMusicStep: boolean
  concertAnchorId: string | null
  concertId: string | null
  concertName: string | null
  inferredTitle: string | null
  showIngestBanner: boolean
}

type ConcertAnchorRow = {
  id: string
  concert: {
    id: string
    name: string
  } | null
}

type TripForSetupContext = {
  setupOrigin: TripSetupOrigin
  title: string | null
  city: string | null
  state: string | null
  country: string | null
  concertAnchors: ConcertAnchorRow[]
}

/** Server-only resolver — wizard reads this; never re-derive path client-side. */
export function resolveTripSetupContext(
  trip: TripForSetupContext,
  options?: { showIngestBanner?: boolean }
): TripSetupContext {
  const anchor = trip.concertAnchors[0] ?? null
  const concert = anchor?.concert ?? null
  const isConcertTrip =
    trip.setupOrigin === 'CONCERT_INGEST' || Boolean(anchor && concert)
  const inferredTitle = concert?.name
    ? inferConcertTripTitle({
        concertName: concert.name,
        city: trip.city,
        state: trip.state,
        country: trip.country,
      })
    : null

  return {
    setupOrigin: trip.setupOrigin,
    isConcertTrip,
    showMusicStep: isConcertTrip,
    concertAnchorId: anchor?.id ?? null,
    concertId: concert?.id ?? null,
    concertName: concert?.name ?? null,
    inferredTitle,
    showIngestBanner: options?.showIngestBanner ?? false,
  }
}
