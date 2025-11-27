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
          {trip.coverImage && (
            <div className="mb-6 rounded-lg overflow-hidden">
              <img
                src={trip.coverImage}
                alt={trip.name}
                className="w-full h-64 object-cover"
              />
            </div>
          )}
          
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">{trip.name}</h1>
              <p className="text-xl text-gray-600 mb-4">
                📍 {trip.city && trip.country ? `${trip.city}, ${trip.country}` : trip.destination || 'No destination set'}
              </p>
              
              {/* Metadata Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {trip.purpose && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    Purpose: {trip.purpose}
                  </span>
                )}
                {trip.whoWith && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                    {trip.whoWith}
                  </span>
                )}
                {trip.partyCount && (
                  <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">
                    {trip.partyCount} {trip.partyCount === 1 ? 'person' : 'people'}
                  </span>
                )}
                {trip.season && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    {trip.season}
                  </span>
                )}
                {trip.tripType && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {trip.tripType}
                  </span>
                )}
                {trip.budgetLevel && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    {trip.budgetLevel}
                  </span>
                )}
              </div>

              {/* Date Range */}
              {trip.startDate && trip.endDate && (
                <p className="text-gray-600 mb-4">
                  📅 {new Date(trip.startDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })} - {new Date(trip.endDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}

              {/* Attendees */}
              {trip.attendees && trip.attendees.length > 0 && trip.tripCrew?.memberships && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Attendees:</p>
                  <div className="flex flex-wrap gap-2">
                    {trip.tripCrew.memberships
                      .filter((m: any) => trip.attendees.includes(m.traveler.id))
                      .map((membership: any) => (
                        <div
                          key={membership.traveler.id}
                          className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full"
                        >
                          {membership.traveler.photoURL ? (
                            <img
                              src={membership.traveler.photoURL}
                              alt={membership.traveler.firstName || 'Member'}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-gray-600 text-xs">
                                {membership.traveler.firstName?.[0] || '?'}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-gray-700">
                            {membership.traveler.firstName} {membership.traveler.lastName}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {trip.notes && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Notes:</p>
                  <p className="text-gray-600 whitespace-pre-wrap">{trip.notes}</p>
                </div>
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

