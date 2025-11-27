import { redirect } from 'next/navigation'
import TripHeader from '@/app/components/trip/TripHeader'
import LodgingCard from '@/app/components/trip/LodgingCard'
import DiningCard from '@/app/components/trip/DiningCard'
import AttractionCard from '@/app/components/trip/AttractionCard'
import LogisticsCard from '@/app/components/trip/LogisticsCard'
import PackListCard from '@/app/components/trip/PackListCard'
import WeatherCard from '@/app/components/trip/WeatherCard'
import ItineraryCard from '@/app/components/trip/ItineraryCard'
import { getTrip } from '@/lib/actions/trip'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { tripId: string }
}

export default async function AdminPage({ params }: PageProps) {
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY || ''

  // Use server action for safe hydration
  const { success, trip, error } = await getTrip(params.tripId)

  if (!success || !trip) {
    redirect('/')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
          <p className="text-yellow-800 font-semibold">🔧 Admin Mode Active</p>
        </div>

        {/* Trip Header with Full Metadata */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">{trip.tripName}</h1>
              <p className="text-xl text-gray-600 mb-4">
                📍 {trip.city}{trip.state ? `, ${trip.state}` : ''}, {trip.country}
              </p>
              
              {/* Purpose */}
              {trip.purpose && (
                <p className="text-lg text-gray-700 mb-4">
                  <span className="font-semibold">Purpose:</span> {trip.purpose}
                </p>
              )}

              {/* Categories */}
              {trip.categories && trip.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {trip.categories.map((category) => (
                    <span
                      key={category}
                      className="px-3 py-1 bg-sky-100 text-sky-800 rounded-full text-sm font-medium"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}

              {/* Computed Metadata */}
              <div className="flex flex-wrap gap-2 mb-4">
                {trip.season && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    {trip.season}
                  </span>
                )}
                {trip.daysTotal && (
                  <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">
                    {trip.daysTotal} {trip.daysTotal === 1 ? 'day' : 'days'}
                  </span>
                )}
              </div>

              {/* Date Range (computed) */}
              {trip.dateRange && (
                <p className="text-gray-600 mb-4">
                  📅 {trip.dateRange}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LodgingCard
              lodging={trip.lodging}
              tripId={trip.id}
              isAdmin={true}
              googleApiKey={googleApiKey}
            />

            <DiningCard
              dining={trip.dining}
              tripId={trip.id}
              isAdmin={true}
              googleApiKey={googleApiKey}
            />

            <AttractionCard
              attractions={trip.attractions}
              tripId={trip.id}
              isAdmin={true}
              googleApiKey={googleApiKey}
            />

            <ItineraryCard
              dining={trip.dining}
              attractions={trip.attractions}
              startDate={trip.startDate}
              endDate={trip.endDate}
              tripId={trip.id}
              isAdmin={true}
            />
          </div>

          <div className="space-y-6">
            <WeatherCard tripId={trip.id} />

            <LogisticsCard
              items={trip.logistics}
              tripId={trip.id}
              isAdmin={true}
            />

            <PackListCard
              items={trip.packItems}
              tripId={trip.id}
              isAdmin={true}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

