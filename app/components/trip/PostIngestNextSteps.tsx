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
      <p className="text-sm font-semibold text-emerald-950 mb-2">Concert trip saved — keep building</p>
      <ul className="text-sm text-emerald-900 space-y-2">
        <li>
          Continue the setup steps below — core details, travel, lodging, and places to go.
        </li>
        <li>
          <Link
            href="/my-trips"
            className="font-medium text-emerald-800 underline hover:text-emerald-950"
          >
            My Trips
          </Link>{' '}
          — see all your saved trips and push to TripCrew when ready.
        </li>
        <li>
          <Link
            href={`/trip/${tripId}/admin?ingested=1`}
            className="font-medium text-emerald-800 underline hover:text-emerald-950"
          >
            Push to TripCrew
          </Link>{' '}
          — link this trip to a crew so members can plan together.
        </li>
      </ul>
    </div>
  )
}
