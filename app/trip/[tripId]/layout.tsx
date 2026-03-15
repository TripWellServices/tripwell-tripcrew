import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTrip } from '@/lib/actions/trip'
import TripNav from '@/app/components/trip/TripNav'

export const dynamic = 'force-dynamic'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ tripId: string }>
}

export default async function TripLayout({ children, params }: LayoutProps) {
  const { tripId } = await params
  const { success, trip } = await getTrip(tripId)

  if (!success || !trip) {
    notFound()
  }

  const crewId = trip.crew?.id ?? ''
  const crewName = trip.crew?.name ?? 'Crew'
  const hasCrew = Boolean(crewId)
  const destinationLine =
    trip.city && trip.country
      ? trip.state
        ? `${trip.city}, ${trip.state}, ${trip.country}`
        : `${trip.city}, ${trip.country}`
      : trip.dateRange ?? ''

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          {hasCrew ? (
            <Link
              href={`/tripcrews/${crewId}`}
              className="text-sm text-sky-600 hover:underline font-medium"
            >
              ← Back to {crewName}
            </Link>
          ) : (
            <Link
              href="/traveler/plans"
              className="text-sm text-sky-600 hover:underline font-medium"
            >
              ← Back to My Plans
            </Link>
          )}
          <h1 className="text-lg font-bold text-gray-900 mt-2 truncate" title={trip.tripName}>
            {trip.tripName}
          </h1>
          {destinationLine && (
            <p className="text-xs text-gray-500 mt-0.5 truncate" title={destinationLine}>
              {destinationLine}
            </p>
          )}
        </div>

        <TripNav tripId={tripId} />
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
