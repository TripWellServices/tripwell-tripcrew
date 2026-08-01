import { notFound } from 'next/navigation'
import TripDayBuilderClient from '@/app/components/trip/TripDayBuilderClient'
import type { SavedTripListItem } from '@/app/components/trip/TripExperienceCard'
import { getTrip } from '@/lib/actions/trip'
import { resolveCityId } from '@/lib/city-mapper'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ tripId: string; dayNumber: string }>
}

export default async function TripDayPage({ params }: PageProps) {
  const { tripId, dayNumber } = await params
  const parsedDayNumber = Number(dayNumber)
  if (!Number.isInteger(parsedDayNumber) || parsedDayNumber < 1) notFound()

  const result = await getTrip(tripId)
  if (!result.success) {
    if (result.code === 'NOT_FOUND') notFound()
    throw new Error(result.error)
  }

  const { trip } = result
  const day = trip.tripDays.find((tripDay) => tripDay.dayNumber === parsedDayNumber)
  if (!day) notFound()
  const catalogueCityId = await resolveCityId(trip.city, trip.state, trip.country)
  const destinationLabel = [trip.city, trip.state, trip.country].filter(Boolean).join(', ')
  const locationBias =
    typeof trip.lodging?.lat === 'number' && typeof trip.lodging?.lng === 'number'
      ? { lat: trip.lodging.lat, lng: trip.lodging.lng, radiusMeters: 25_000 }
      : null

  const savedItems: SavedTripListItem[] = [
    ...trip.dining.map((item) => ({
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
    ...trip.attractions.map((item) => ({
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
    <TripDayBuilderClient
      tripId={trip.id}
      day={day}
      savedItems={savedItems}
      backHref={`/trip/${trip.id}/plan`}
      catalogueCityId={catalogueCityId}
      destinationLabel={destinationLabel || null}
      locationBias={locationBias}
    />
  )
}
