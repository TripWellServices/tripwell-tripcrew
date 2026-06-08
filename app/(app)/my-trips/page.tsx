'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { LocalStorageAPI } from '@/lib/localStorage'
import { onAuthStateChanged } from 'firebase/auth'
import SendToTripCrew from '@/app/components/trip/SendToTripCrew'

interface PersonalTrip {
  id: string
  tripName: string
  city: string | null
  state: string | null
  country: string | null
  dateRange: string | null
  startDate: string | Date
  endDate: string | Date
  crewId: string | null
  crew?: { id: string; name: string | null } | null
}

export default function MyTripsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [trips, setTrips] = useState<PersonalTrip[]>([])
  const [expandedPushId, setExpandedPushId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/')
        return
      }
      const tid = LocalStorageAPI.getTravelerId()
      if (tid) void loadTrips(tid)
      else setLoading(false)
    })
    return () => unsub()
  }, [router])

  async function loadTrips(travelerId: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/traveler/trips?travelerId=${encodeURIComponent(travelerId)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load trips')
      }
      const data = await res.json()
      setTrips(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load trips')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-500 text-sm mt-1">Your personal concert trips — push to TripCrew when ready.</p>
        </div>
        <Link
          href="/plan"
          className="inline-flex px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700"
        >
          + Concert Planner
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {error}
        </p>
      ) : null}

      {trips.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-600 mb-4">No trips yet. Start with a concert.</p>
          <Link href="/plan" className="text-sky-600 font-medium hover:underline">
            Open Concert Planner
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {trips.map((trip) => (
            <li
              key={trip.id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/trip/${trip.id}/admin`}
                    className="font-semibold text-gray-900 hover:text-sky-700"
                  >
                    {trip.tripName}
                  </Link>
                  {trip.city ? (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {trip.city}
                      {trip.state ? `, ${trip.state}` : ''}
                      {trip.country ? `, ${trip.country}` : ''}
                    </p>
                  ) : null}
                  {trip.dateRange ? (
                    <p className="text-xs text-gray-400 mt-1">{trip.dateRange}</p>
                  ) : null}
                  {trip.crew?.name ? (
                    <p className="text-xs text-emerald-700 mt-1">On crew: {trip.crew.name}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Personal — not on a crew yet</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/trip/${trip.id}/admin`}
                    className="px-3 py-1.5 text-sm font-medium text-sky-700 border border-sky-200 rounded-lg hover:bg-sky-50"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPushId((id) => (id === trip.id ? null : trip.id))
                    }
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Push to TripCrew
                  </button>
                </div>
              </div>
              {expandedPushId === trip.id ? (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <SendToTripCrew
                    tripId={trip.id}
                    currentCrewId={trip.crewId ?? null}
                    currentCrewName={trip.crew?.name ?? null}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
