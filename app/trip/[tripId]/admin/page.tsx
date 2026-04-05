import { redirect } from 'next/navigation'
import TripHeader from '@/app/components/trip/TripHeader'
import LodgingCard from '@/app/components/trip/LodgingCard'
import DiningCard from '@/app/components/trip/DiningCard'
import AttractionCard from '@/app/components/trip/AttractionCard'
import LogisticsCard from '@/app/components/trip/LogisticsCard'
import PackListCard from '@/app/components/trip/PackListCard'
import WeatherCard from '@/app/components/trip/WeatherCard'
import TripExperienceCard from '@/app/components/trip/TripExperienceCard'
import { getTrip } from '@/lib/actions/trip'
import { tripDateRangeLabel, tripDisplayTitle } from '@/lib/trip/computeTripMetadata'
import SendToTripCrew from '@/app/components/trip/SendToTripCrew'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ tripId: string }>
}

export default async function AdminPage({ params }: PageProps) {
  const { tripId } = await params
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY || ''

  // Use server action for safe hydration
  const { success, trip, error } = await getTrip(tripId)

  if (!success || !trip) {
    redirect('/')
  }

  const searchLocationBias =
    trip.lodging?.lat != null && trip.lodging?.lng != null
      ? { lat: trip.lodging.lat, lng: trip.lodging.lng }
      : null

  const title = tripDisplayTitle(trip.purpose)
  const dateRangeLabel = tripDateRangeLabel(trip.startDate, trip.endDate)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
          <p className="text-yellow-800 font-semibold">🔧 Admin Mode Active</p>
        </div>

        <div className="mb-6">
          <SendToTripCrew
            tripId={trip.id}
            currentCrewId={trip.crewId ?? null}
            currentCrewName={trip.crew?.name ?? null}
          />
        </div>

        {/* Trip Header with Full Metadata */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">{title}</h1>
              <p className="text-xl text-gray-600 mb-4">
                📍 {trip.city}{trip.state ? `, ${trip.state}` : ''}, {trip.country}
              </p>
              
              {/* Purpose */}
              {trip.purpose && (
                <p className="text-lg text-gray-700 mb-4">
                  <span className="font-semibold">Purpose:</span> {trip.purpose}
                </p>
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

              <p className="text-gray-600 mb-4">📅 {dateRangeLabel}</p>
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
              searchLocationBias={searchLocationBias}
            />

            <AttractionCard
              attractions={trip.attractions}
              tripId={trip.id}
              isAdmin={true}
              searchLocationBias={searchLocationBias}
            />

            <TripExperienceCard
              tripDays={trip.tripDays}
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
  )
}

