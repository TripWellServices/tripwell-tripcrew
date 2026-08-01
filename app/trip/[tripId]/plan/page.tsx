import Link from 'next/link'
import { notFound } from 'next/navigation'
import TripExperienceCard from '@/app/components/trip/TripExperienceCard'
import TripQuickAddPanel from '@/app/components/trip/TripQuickAddPanel'
import { getTrip } from '@/lib/actions/trip'
import { resolveCityId } from '@/lib/city-mapper'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ tripId: string }>
}

export default async function TripPlanPage({ params }: PageProps) {
  const { tripId } = await params

  const result = await getTrip(tripId)

  if (!result.success) {
    if (result.code === 'NOT_FOUND') notFound()
    throw new Error(result.error)
  }

  const { trip } = result
  const catalogueCityId = await resolveCityId(trip.city, trip.state, trip.country)
  const destinationLabel = [trip.city, trip.state, trip.country].filter(Boolean).join(', ')
  const locationBias =
    typeof trip.lodging?.lat === 'number' && typeof trip.lodging?.lng === 'number'
      ? { lat: trip.lodging.lat, lng: trip.lodging.lng, radiusMeters: 25_000 }
      : null

  const scheduled = new Set<string>()
  for (const day of trip.tripDays ?? []) {
    for (const exp of day.experiences ?? []) {
      if (exp.dining?.id) scheduled.add(`dining:${exp.dining.id}`)
      if (exp.attraction?.id) scheduled.add(`attraction:${exp.attraction.id}`)
      if (exp.adventure?.id) scheduled.add(`adventure:${exp.adventure.id}`)
      if (exp.concert?.id) scheduled.add(`concert:${exp.concert.id}`)
    }
  }

  const savedItems = [
    ...trip.dining
      .filter((item) => !scheduled.has(`dining:${item.id}`))
      .map((item) => ({
        kind: 'dining' as const,
        id: item.id,
        title: item.title,
        category: item.category,
        description: item.description,
        address: item.address,
      })),
    ...trip.attractions
      .filter((item) => !scheduled.has(`attraction:${item.id}`))
      .map((item) => ({
        kind: 'attraction' as const,
        id: item.id,
        title: item.title,
        category: item.category,
        description: item.description,
        address: item.address,
      })),
    ...(trip.adventures ?? [])
      .filter((item) => !scheduled.has(`adventure:${item.id}`))
      .map((item) => ({
        kind: 'adventure' as const,
        id: item.id,
        title: item.name,
        category: item.category,
        description: item.notes,
        address: null,
      })),
    ...(trip.concertAnchors ?? [])
      .map((anchor) => anchor.concert)
      .filter((concert): concert is NonNullable<typeof concert> => Boolean(concert))
      .filter((concert) => !scheduled.has(`concert:${concert.id}`))
      .map((concert) => ({
        kind: 'concert' as const,
        id: concert.id,
        title: concert.name,
        category: concert.isFestival ? 'Festival' : 'Concert',
        description: concert.description,
        address: concert.venue,
      })),
  ]

  const hasWishlist =
    savedItems.length > 0 ||
    trip.dining.length > 0 ||
    trip.attractions.length > 0 ||
    (trip.adventures?.length ?? 0) > 0 ||
    (trip.concertAnchors?.length ?? 0) > 0
  const hasScheduled =
    (trip.tripDays?.some((d) => (d.experiences?.length ?? 0) > 0) ?? false)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Itinerary</h1>
          <p className="text-gray-600 max-w-2xl">
            Build your day-by-day schedule. Add restaurants and places here, then put them on the
            day they belong.
          </p>
        </div>
        <Link
          href={`/trip/${tripId}/admin`}
          className="shrink-0 px-4 py-2 text-sm font-medium text-sky-800 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100"
        >
          Full setup →
        </Link>
      </div>

      <TripQuickAddPanel
        tripId={trip.id}
        catalogueCityId={catalogueCityId}
        destinationLabel={destinationLabel || null}
        diningIds={trip.dining.map((item) => item.id)}
        attractionIds={trip.attractions.map((item) => item.id)}
        locationBias={locationBias}
      />

      {!trip.lodging && !hasWishlist ? (
        <p className="my-6 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Add restaurants and places above, then schedule them below. Use{' '}
          <Link href={`/trip/${tripId}/admin`} className="font-medium underline">
            full setup
          </Link>{' '}
          only for lodging, flights, groceries, and core trip details.
        </p>
      ) : null}

      {hasWishlist && !hasScheduled ? (
        <p className="my-6 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          You have saved places — assign them to days below, or add more above.
        </p>
      ) : null}

      <section className="mt-6">
        <TripExperienceCard
          tripDays={trip.tripDays}
          startDate={trip.startDate}
          endDate={trip.endDate}
          tripId={trip.id}
          isAdmin={true}
          savedItems={savedItems}
        />
      </section>
    </div>
  )
}
