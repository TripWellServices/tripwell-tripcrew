import { redirect } from 'next/navigation'
import TripHeader from '@/app/components/trip/TripHeader'
import LodgingCard from '@/app/components/trip/LodgingCard'
import DiningCard from '@/app/components/trip/DiningCard'
import AttractionCard from '@/app/components/trip/AttractionCard'
import LogisticsCard from '@/app/components/trip/LogisticsCard'
import PackListCard from '@/app/components/trip/PackListCard'
import WeatherCard from '@/app/components/trip/WeatherCard'
import ItineraryCard from '@/app/components/trip/ItineraryCard'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { tripId: string }
}

export default async function AdminPage({ params }: PageProps) {
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY || ''

  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      tripCrew: {
        include: {
          memberships: {
            include: {
              traveler: true,
            },
          },
          roles: {
            include: {
              traveler: true,
            },
          },
        },
      },
      lodging: true,
      dining: true,
      attractions: true,
      logistics: true,
      packItems: true,
    },
  })

  if (!trip) {
    redirect('/')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
          <p className="text-yellow-800 font-semibold">🔧 Admin Mode Active</p>
        </div>

        <TripHeader
          name={trip.name}
          destination={trip.destination}
          startDate={trip.startDate}
          endDate={trip.endDate}
          coverImage={trip.coverImage}
        />

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

