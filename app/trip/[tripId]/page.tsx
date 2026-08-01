import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import TripHeader from '@/app/components/trip/TripHeader'
import LodgingCard from '@/app/components/trip/LodgingCard'
import DiningCard from '@/app/components/trip/DiningCard'
import AttractionCard from '@/app/components/trip/AttractionCard'
import LogisticsCard from '@/app/components/trip/LogisticsCard'
import PackListCard from '@/app/components/trip/PackListCard'
import WeatherCard from '@/app/components/trip/WeatherCard'
import TripExperienceCard, {
  type SavedTripListItem,
} from '@/app/components/trip/TripExperienceCard'
import TripMemoriesCard from '@/app/components/trip/TripMemoriesCard'
import PostIngestNextSteps from '@/app/components/trip/PostIngestNextSteps'
import TripQuickAddPanel from '@/app/components/trip/TripQuickAddPanel'
import { resolveGooglePlacesApiKey } from '@/lib/google-places-config'
import { getTrip } from '@/lib/actions/trip'
import { resolveCityId } from '@/lib/city-mapper'
import { resolveTripTitle } from '@/lib/trip/computeTripMetadata'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { tripId: string }
}

export default async function TripPage({ params }: PageProps) {
  const googleApiKey = resolveGooglePlacesApiKey() || ''

  // Use server action for safe hydration
  const result = await getTrip(params.tripId)

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
  const scheduledDiningIds = new Set<string>()
  const scheduledAttractionIds = new Set<string>()
  for (const day of trip.tripDays) {
    for (const experience of day.experiences) {
      if (experience.dining?.id) scheduledDiningIds.add(experience.dining.id)
      if (experience.attraction?.id) scheduledAttractionIds.add(experience.attraction.id)
    }
  }
  const unscheduledSavedItems: SavedTripListItem[] = [
    ...trip.dining
      .filter((item) => !scheduledDiningIds.has(item.id))
      .map((item) => ({
        kind: 'dining' as const,
        id: item.id,
        title: item.title,
        category: item.category,
        description: item.description,
        address: item.address,
        website: item.website,
        phone: item.phone,
        rating: item.rating,
        metadata: item.metadata,
      })),
    ...trip.attractions
      .filter((item) => !scheduledAttractionIds.has(item.id))
      .map((item) => ({
        kind: 'attraction' as const,
        id: item.id,
        title: item.title,
        category: item.category,
        description: item.description,
        address: item.address,
        website: item.website,
        phone: item.phone,
        rating: item.rating,
        metadata: item.metadata,
      })),
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
        <TripHeader
          name={resolveTripTitle(trip.title, trip.purpose)}
          destination={trip.state ? `${trip.city}, ${trip.state}, ${trip.country}` : `${trip.city}, ${trip.country}`}
          startDate={trip.startDate}
          endDate={trip.endDate}
        />

        <Suspense fallback={null}>
          <PostIngestNextSteps />
        </Suspense>

        <TripQuickAddPanel
          tripId={trip.id}
          catalogueCityId={catalogueCityId}
          destinationLabel={destinationLabel || null}
          diningIds={trip.dining.map((item) => item.id)}
          attractionIds={trip.attractions.map((item) => item.id)}
          locationBias={locationBias}
        />

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LodgingCard
              lodging={trip.lodging}
              tripId={trip.id}
              googleApiKey={googleApiKey}
            />

            <DiningCard
              dining={trip.dining}
              tripId={trip.id}
              catalogueCityId={catalogueCityId}
            />

            <AttractionCard
              attractions={trip.attractions}
              tripId={trip.id}
              catalogueCityId={catalogueCityId}
            />

            <TripExperienceCard
              tripDays={trip.tripDays}
              startDate={trip.startDate}
              endDate={trip.endDate}
              tripId={trip.id}
              savedItems={unscheduledSavedItems}
              canScheduleSavedItems
            />

            <TripMemoriesCard tripId={trip.id} />
          </div>

          <div className="space-y-6">
            <WeatherCard tripId={trip.id} />

            <LogisticsCard
              items={trip.logistics}
              tripId={trip.id}
            />

            <PackListCard
              items={trip.packItems}
              tripId={trip.id}
            />
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          Need lodging, flights, or core trip details?{' '}
          <a href={`/trip/${params.tripId}/admin`} className="text-sky-600 hover:underline">
            Open details
          </a>
          .
        </div>
    </div>
  )
}

