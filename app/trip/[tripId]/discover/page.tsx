'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { getHydrateTraveler } from '@/lib/hydrateTravelerClient'
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
  const [cityGuide, setCityGuide] = useState<{
    tagline: string | null
    description: string | null
    bestTimeToVisit: string | null
    attractionNames: string[]
  } | null>(null)
  const [selectedDestIdx, setSelectedDestIdx] = useState(0)

  // Resolve Firebase auth → travelerId
  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Resolve Firebase UID to Traveler ID
        try {
          const res = await getHydrateTraveler(user)
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
    setSelectedDestIdx(0)
    setTrip(null)
    setLoading(true)
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

  const activeCity = destinations[selectedDestIdx]?.cityName || defaultCity
  const activeState = destinations[selectedDestIdx]?.state || defaultState
  const tripCountry = trip?.country ?? 'USA'

  useEffect(() => {
    if (!trip?.city?.trim()) {
      setCityGuide(null)
      return
    }
    const city = trip.city.trim()
    const state = typeof trip.state === 'string' ? trip.state.trim() : ''
    const country = typeof trip.country === 'string' && trip.country.trim() ? trip.country.trim() : 'USA'
    let cancelled = false
    const loadGuide = () =>
      fetch(
        `/api/city/lookup?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&country=${encodeURIComponent(country)}`
      )
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !d?.city) return
          setCityGuide({
            tagline: d.city.tagline ?? null,
            description: d.city.description ?? null,
            bestTimeToVisit: d.city.bestTimeToVisit ?? null,
            attractionNames: Array.isArray(d.city.attractionNames) ? d.city.attractionNames : [],
          })
        })
        .catch(() => {})
    loadGuide()
    const t = window.setTimeout(loadGuide, 4000)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [trip?.city, trip?.state, trip?.country])

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
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Experiences</h1>
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

      {cityGuide &&
      (cityGuide.description ||
        cityGuide.tagline ||
        cityGuide.bestTimeToVisit ||
        cityGuide.attractionNames.length > 0) ? (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/80 p-5 shadow-sm">
          {cityGuide.tagline ? (
            <p className="text-sm font-semibold text-sky-950">{cityGuide.tagline}</p>
          ) : null}
          {cityGuide.description ? (
            <p className="text-sm text-gray-800 mt-2 leading-relaxed">{cityGuide.description}</p>
          ) : null}
          {cityGuide.bestTimeToVisit ? (
            <p className="text-xs text-sky-900 font-medium mt-2">
              Best time: {cityGuide.bestTimeToVisit}
            </p>
          ) : null}
          {cityGuide.attractionNames.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Ideas to explore
              </p>
              <div className="flex flex-wrap gap-2">
                {cityGuide.attractionNames.slice(0, 12).map((name) => (
                  <span
                    key={name}
                    className="px-2 py-1 rounded-md bg-white border border-sky-200 text-xs text-gray-800"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : activeCity ? (
        <div className="mb-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
          We&apos;re pulling a short guide for {activeCity}
          {activeState ? `, ${activeState}` : ''}. If this stays blank, check{' '}
          <code className="text-xs bg-gray-200 px-1 rounded">OPENAI_API_KEY</code> — enrichment runs when
          the trip is created.
        </div>
      ) : null}

      <DiscoverFlow
        defaultCity={activeCity}
        defaultState={activeState}
        tripId={tripId}
        travelerId={travelerId}
        tripDaysTotal={trip.daysTotal ?? null}
        tripWhoWith={trip.whoWith ?? null}
        tripSeason={trip.season ?? null}
        tripCountry={tripCountry}
      />
    </div>
  )
}
