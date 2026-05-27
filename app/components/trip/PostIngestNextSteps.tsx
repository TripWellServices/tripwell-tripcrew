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
      <p className="text-sm font-semibold text-emerald-950 mb-2">Trip created — what&apos;s next?</p>
      <ul className="text-sm text-emerald-900 space-y-2">
        <li>
          <Link
            href={`/trip/${tripId}/discover`}
            className="font-medium text-emerald-800 underline hover:text-emerald-950"
          >
            Discover experiences
          </Link>{' '}
          — add city POI to specific days on your itinerary.
        </li>
        <li>
          <Link
            href={`/trip/${tripId}/admin?ingested=1`}
            className="font-medium text-emerald-800 underline hover:text-emerald-950"
          >
            Invite to TripCrew
          </Link>{' '}
          — share the trip so family can plan with you.
        </li>
      </ul>
    </div>
  )
}
