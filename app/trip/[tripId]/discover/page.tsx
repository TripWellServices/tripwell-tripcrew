'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getTrip } from '@/lib/actions/trip'
import DiscoverFlow from '@/app/components/discover/DiscoverFlow'
import Link from 'next/link'

export default function TripDiscoverPage() {
  const params = useParams()
  const tripId = params.tripId as string

  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [trip, setTrip] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Resolve Firebase auth → travelerId
  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Resolve Firebase UID to Traveler ID
        try {
          const res = await fetch(`/api/auth/hydrate?firebaseId=${user.uid}`)
          const data = await res.json()
          setTravelerId(data.traveler?.id ?? null)
        } catch {
          setTravelerId(null)
        }
      } else {
        setTravelerId(null)
      }
    })
    return () => unsubscribe()
  }, [])

  // Load trip to get destination city
  useEffect(() => {
    async function load() {
      const { success, trip: t } = await getTrip(tripId)
      if (success && t) setTrip(t)
      setLoading(false)
    }
    load()
  }, [tripId])

  // Pick the first destination city as the default
  const firstDestination = trip?.destinations?.[0]
  const defaultCity = firstDestination?.city?.name ?? trip?.city ?? ''
  const defaultState = firstDestination?.city?.state ?? trip?.state ?? ''

  // Build destination selector options for multi-city trips
  const destinations: Array<{ cityName: string; state: string }> =
    trip?.destinations?.map((d: any) => ({
      cityName: d.city?.name ?? '',
      state: d.city?.state ?? '',
    })).filter((d: any) => d.cityName) ?? []

  const [selectedDestIdx, setSelectedDestIdx] = useState(0)
  const activeCity = destinations[selectedDestIdx]?.cityName || defaultCity
  const activeState = destinations[selectedDestIdx]?.state || defaultState

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-400 animate-pulse">Loading…</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-red-500 text-sm">Trip not found.</p>
        <Link href="/" className="text-sky-600 text-sm hover:underline mt-2 inline-block">Go home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Add Experiences</h1>
      <p className="text-gray-500 text-sm mb-6">
        Add things to do here — save to your list or drop straight into this trip&apos;s itinerary.
      </p>

      {/* Multi-city destination selector */}
      {destinations.length > 1 && (
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Which city?
          </label>
          <div className="flex flex-wrap gap-2">
            {destinations.map((d, i) => (
              <button
                key={i}
                onClick={() => setSelectedDestIdx(i)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  selectedDestIdx === i
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-sky-400'
                }`}
              >
                {d.cityName}{d.state ? `, ${d.state}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <DiscoverFlow
        defaultCity={activeCity}
        defaultState={activeState}
        tripId={tripId}
        travelerId={travelerId}
      />
    </div>
  )
}
