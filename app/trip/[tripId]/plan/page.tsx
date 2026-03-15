import { notFound } from 'next/navigation'
import LodgingCard from '@/app/components/trip/LodgingCard'
import DiningCard from '@/app/components/trip/DiningCard'
import AttractionCard from '@/app/components/trip/AttractionCard'
import ItineraryCard from '@/app/components/trip/ItineraryCard'
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

  const itineraryConcerts = (trip.itineraryItems ?? []).filter(
    (item: { concertId?: string | null }) => item.concertId
  )
  const itineraryHikes = (trip.itineraryItems ?? []).filter(
    (item: { hikeId?: string | null }) => item.hikeId
  )

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
            googleApiKey={googleApiKey}
          />
        </section>

        {/* Attractions */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Attractions</h2>
          <AttractionCard
            attractions={trip.attractions}
            tripId={trip.id}
            isAdmin={true}
            googleApiKey={googleApiKey}
          />
        </section>

        {/* Concerts */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Concerts</h2>
          {itineraryConcerts.length > 0 ? (
            <ul className="space-y-2">
              {itineraryConcerts.map((item: { id: string; title: string; concert?: { name?: string; artist?: string; venue?: string; eventDate?: string } | null }) => (
                <li key={item.id} className="text-gray-700">
                  {item.concert?.name ?? item.title}
                  {item.concert?.artist && ` · ${item.concert.artist}`}
                  {item.concert?.venue && ` @ ${item.concert.venue}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">
              No concerts on the itinerary yet. Add an itinerary item and link it to a concert (first-class) from the Itinerary section below.
            </p>
          )}
        </section>

        {/* Hikes */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Hikes</h2>
          {itineraryHikes.length > 0 ? (
            <ul className="space-y-2">
              {itineraryHikes.map((item: { id: string; title: string; hike?: { name?: string; trailOrPlace?: string; difficulty?: string } | null }) => (
                <li key={item.id} className="text-gray-700">
                  {item.hike?.name ?? item.title}
                  {item.hike?.trailOrPlace && ` — ${item.hike.trailOrPlace}`}
                  {item.hike?.difficulty && ` (${item.hike.difficulty})`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">
              No hikes on the itinerary yet. Add an itinerary item and link it to a hike (first-class) from the Itinerary section below.
            </p>
          )}
        </section>

        {/* Itinerary */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Itinerary</h2>
          <p className="text-gray-500 text-sm mb-4">
            Day-by-day view. Add and assign dining, attractions, concerts, hikes, and more.
          </p>
          <ItineraryCard
            dining={trip.dining}
            attractions={trip.attractions}
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
