'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'

export default function PostIngestNextSteps() {
  const params = useParams()
  const searchParams = useSearchParams()
  const ingested = searchParams.get('ingested') === '1'
  const tripId = typeof params.tripId === 'string' ? params.tripId : null
  if (!ingested || !tripId) return null

  return (
    <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4">
      <p className="text-sm font-semibold text-emerald-950 mb-2">Trip saved — ready to use</p>
      <ul className="text-sm text-emerald-900 space-y-2">
        <li>
          Add restaurants, places, and day-by-day plans from the trip or itinerary page.
        </li>
        <li>
          <Link
            href={`/trip/${tripId}/plan`}
            className="font-medium text-emerald-800 underline hover:text-emerald-950"
          >
            Open itinerary
          </Link>{' '}
          — add what you find and schedule saved places onto trip days.
        </li>
        <li>
          <Link
            href="/my-trips"
            className="font-medium text-emerald-800 underline hover:text-emerald-950"
          >
            My Trips
          </Link>{' '}
          — view all saved trips and push to TripCrew when ready.
        </li>
      </ul>
    </div>
  )
}
