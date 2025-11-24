import { notFound } from 'next/navigation'
import TripHeader from '@/app/components/trip/TripHeader'
import LodgingCard from '@/app/components/trip/LodgingCard'
import DiningCard from '@/app/components/trip/DiningCard'
import AttractionCard from '@/app/components/trip/AttractionCard'
import LogisticsCard from '@/app/components/trip/LogisticsCard'
import PackListCard from '@/app/components/trip/PackListCard'
import WeatherCard from '@/app/components/trip/WeatherCard'
import ItineraryCard from '@/app/components/trip/ItineraryCard'
import { prisma } from '@/lib/prisma'

interface PageProps {
  params: { tripId: string }
  searchParams: { admin?: string }
}

export default async function TripPage({ params, searchParams }: PageProps) {
  const isAdmin = searchParams.admin === '1'
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY || ''

  const trip = await prisma.trip.findUnique({
    where: { id: params.tripId },
    include: {
      owner: true,
      lodging: true,
      dining: true,
      attractions: true,
      logistics: true,
      packItems: true,
    },
  })

  if (!trip) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
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
              isAdmin={isAdmin}
              googleApiKey={googleApiKey}
            />

            <DiningCard
              dining={trip.dining}
              tripId={trip.id}
              isAdmin={isAdmin}
              googleApiKey={googleApiKey}
            />

            <AttractionCard
              attractions={trip.attractions}
              tripId={trip.id}
              isAdmin={isAdmin}
              googleApiKey={googleApiKey}
            />

            <ItineraryCard
              dining={trip.dining}
              attractions={trip.attractions}
              startDate={trip.startDate}
              endDate={trip.endDate}
              tripId={trip.id}
              isAdmin={isAdmin}
            />
          </div>

          <div className="space-y-6">
            <WeatherCard tripId={trip.id} />

            <LogisticsCard
              items={trip.logistics}
              tripId={trip.id}
              isAdmin={isAdmin}
            />

            <PackListCard
              items={trip.packItems}
              tripId={trip.id}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        {!isAdmin && (
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>View-only mode. Add ?admin=1 to the URL to edit.</p>
          </div>
        )}
      </div>
    </main>
  )
}

