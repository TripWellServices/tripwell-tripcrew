import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import TripSetupWizard from '@/app/components/trip/setup/TripSetupWizard'
import PostIngestNextSteps from '@/app/components/trip/PostIngestNextSteps'
import type { LineupRow } from '@/app/components/trip/setup/trip-setup-wizard-steps'
import { scheduleItemToLineupRow } from '@/lib/concert-lineup'
import { getTrip } from '@/lib/actions/trip'
import { resolveCityId } from '@/lib/city-mapper'
import { resolveTripTitle } from '@/lib/trip/computeTripMetadata'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ tripId: string }>
  searchParams: Promise<{ ingested?: string }>
}

function dateInputValue(d: Date | string | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default async function AdminPage({ params, searchParams }: PageProps) {
  const { tripId } = await params
  const { ingested } = await searchParams
  const showIngestBanner = ingested === '1'
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY || ''

  const { success, trip } = await getTrip(tripId)

  if (!success || !trip) {
    redirect('/')
  }

  const catalogueCityId = await resolveCityId(trip.city, trip.state, trip.country)

  const primaryAnchor = trip.concertAnchors?.[0]
  const concert = primaryAnchor?.concert ?? null

  const eventStartForLineup = dateInputValue(
    concert?.eventStartDate ?? concert?.eventDate
  )

  const scheduleRows: LineupRow[] =
    concert?.scheduleItems?.map((item) =>
      scheduleItemToLineupRow(
        {
          title: item.title ?? '',
          date: item.date ? dateInputValue(item.date) : null,
          startTime: item.startTime,
          endTime: item.endTime,
        },
        eventStartForLineup
      )
    ) ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {showIngestBanner ? (
        <Suspense fallback={null}>
          <div className="mb-6">
            <PostIngestNextSteps />
          </div>
        </Suspense>
      ) : null}
      <TripSetupWizard
        tripId={trip.id}
        googleApiKey={googleApiKey}
        catalogueCityId={catalogueCityId}
        initial={{
          title: trip.title,
          purpose: trip.purpose,
          city: trip.city,
          state: trip.state,
          country: trip.country,
          startDate: trip.startDate.toISOString(),
          endDate: trip.endDate.toISOString(),
          transportMode: trip.transportMode,
          startingLocation: trip.startingLocation,
          lodging: trip.lodging,
          dining: trip.dining,
          attractions: trip.attractions,
          logistics: trip.logistics,
          concertId: concert?.id ?? null,
          concertName:
            concert?.name ?? resolveTripTitle(trip.title, trip.purpose),
          concertArtist: concert?.artist ?? '',
          concertVenue: concert?.venue ?? '',
          concertUrl: concert?.url ?? '',
          concertDescription: concert?.description ?? '',
          eventStartDate: dateInputValue(concert?.eventStartDate ?? concert?.eventDate),
          eventEndDate: dateInputValue(concert?.eventEndDate ?? concert?.eventStartDate),
          eventStartTime: concert?.eventStartTime ?? '',
          eventEndTime: concert?.eventEndTime ?? '',
          isFestival: concert?.isFestival ?? false,
          scheduleRows,
        }}
      />
    </div>
  )
}
