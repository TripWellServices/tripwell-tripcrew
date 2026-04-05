import { notFound } from 'next/navigation'
import LodgingCard from '@/app/components/trip/LodgingCard'
import DiningCard from '@/app/components/trip/DiningCard'
import AttractionCard from '@/app/components/trip/AttractionCard'
import TripExperienceCard from '@/app/components/trip/TripExperienceCard'
import { getTrip } from '@/lib/actions/trip'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ tripId: string }>
}

export default async function TripPlanPage({ params }: PageProps) {
  const { tripId } = await params
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY || ''

  const { success, trip, error } = await getTrip(tripId)

  if (!success || !trip) {
    notFound()
  }

  const searchLocationBias =
    trip.lodging?.lat != null && trip.lodging?.lng != null
      ? { lat: trip.lodging.lat, lng: trip.lodging.lng }
      : null

  const allExperiences =
    trip.tripDays?.flatMap((d) => d.experiences ?? []) ?? []
  const itineraryConcerts = allExperiences.filter((e) => e.concertId)
  const itineraryHikes = allExperiences.filter((e) => e.hikeId)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Plan</h1>
      <p className="text-gray-600 mb-8">
        Manage where you&apos;re going, where you&apos;re staying, and what you&apos;re doing — then build your day-by-day itinerary.
      </p>

      <div className="space-y-10">
        {/* Destinations */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Destinations</h2>
          {trip.destinations && trip.destinations.length > 0 ? (
            <ul className="space-y-2">
              {trip.destinations.map((d: { id: string; name?: string | null; city?: { name: string; state?: string | null; country?: string | null } }) => (
                <li key={d.id} className="text-gray-700">
                  {d.name ?? [d.city?.name, d.city?.state, d.city?.country].filter(Boolean).join(', ')}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">
              No destinations yet. Add cities from the crew&apos;s Plan a Trip flow or edit trip details.
            </p>
          )}
        </section>

        {/* Lodging */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Lodging</h2>
          <LodgingCard
            lodging={trip.lodging}
            tripId={trip.id}
            isAdmin={true}
            googleApiKey={googleApiKey}
          />
        </section>

        {/* Dining */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Dining</h2>
          <DiningCard
            dining={trip.dining}
            tripId={trip.id}
            isAdmin={true}
            searchLocationBias={searchLocationBias}
          />
        </section>

        {/* Attractions */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Attractions</h2>
          <AttractionCard
            attractions={trip.attractions}
            tripId={trip.id}
            isAdmin={true}
            searchLocationBias={searchLocationBias}
          />
        </section>

        {/* Concerts */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Concerts</h2>
          {itineraryConcerts.length > 0 ? (
            <ul className="space-y-2">
              {itineraryConcerts.map((item) => (
                <li key={item.id} className="text-gray-700">
                  {item.concert?.name ?? 'Concert'}
                  {item.concert?.artist && ` · ${item.concert.artist}`}
                  {item.concert?.venue && ` @ ${item.concert.venue}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">
              No concerts on the itinerary yet. Add an itinerary item and link it to a concert (first-class) from the Day plan section below.
            </p>
          )}
        </section>

        {/* Hikes */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Hikes</h2>
          {itineraryHikes.length > 0 ? (
            <ul className="space-y-2">
              {itineraryHikes.map((item) => (
                <li key={item.id} className="text-gray-700">
                  {item.hike?.name ?? 'Hike'}
                  {item.hike?.trailOrPlace && ` — ${item.hike.trailOrPlace}`}
                  {item.hike?.difficulty && ` (${item.hike.difficulty})`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">
              No hikes on the itinerary yet. Add an itinerary item and link it to a hike (first-class) from the Day plan section below.
            </p>
          )}
        </section>

        {/* Itinerary */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Day plan</h2>
          <p className="text-gray-500 text-sm mb-4">
            Day-by-day TripDay experiences. Add dining, attractions, concerts, hikes, and more.
          </p>
          <TripExperienceCard
            tripDays={trip.tripDays}
            startDate={trip.startDate}
            endDate={trip.endDate}
            tripId={trip.id}
            isAdmin={true}
          />
        </section>
      </div>
    </div>
  )
}
