'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getFirebaseAuth } from '@/lib/firebase'
import { getHydrateTraveler } from '@/lib/hydrateTravelerClient'
import { onAuthStateChanged } from 'firebase/auth'

interface TripRow {
  id: string
  purpose: string
  startDate: string
  endDate: string
  _count?: { destinations: number; tripDays: number }
}

export default function CrewTripsPage() {
  const params = useParams()
  const tripCrewId = params.id as string
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [trips, setTrips] = useState<TripRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [purpose, setPurpose] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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

  useEffect(() => {
    if (!tripCrewId) return
    setLoading(true)
    fetch(`/api/tripcrew/${tripCrewId}/trips`)
      .then((r) => r.json())
      .then((data) => setTrips(Array.isArray(data) ? data : []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false))
  }, [tripCrewId])

  async function createTrip() {
    if (!travelerId || !tripCrewId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tripcrew/${tripCrewId}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createPlanned: true,
          travelerId,
          purpose: purpose.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create trip')
      const listRes = await fetch(`/api/tripcrew/${tripCrewId}/trips`)
      const list = await listRes.json().catch(() => [])
      setTrips(Array.isArray(list) ? list : [])
      setShowNew(false)
      setPurpose('')
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  function formatRange(start: string, end: string) {
    try {
      const s = new Date(start)
      const e = new Date(end)
      const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
      return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`
    } catch {
      return ''
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href={`/tripcrews/${tripCrewId}`}
        className="text-sm text-sky-600 hover:underline font-medium mb-4 inline-block"
      >
        ← Back to crew
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Crew trips</h1>
      <p className="text-gray-500 text-sm mb-6">
        Trips for this crew. Open one to plan days and experiences.
      </p>

      <div className="space-y-4">
        {showNew ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">New trip</h2>
            <input
              type="text"
              placeholder="What you’re planning (optional)"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNew(false)
                  setPurpose('')
                }}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createTrip}
                disabled={submitting || !travelerId}
                className="px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
            {!travelerId && (
              <p className="text-xs text-amber-700 mt-2">Sign in to create a trip.</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-sky-400 hover:text-sky-600 text-sm font-medium"
          >
            + New trip
          </button>
        )}

        {loading && <p className="text-sm text-gray-500 text-center py-8">Loading…</p>}
        {!loading && trips.length === 0 && !showNew && (
          <p className="text-sm text-gray-500 text-center py-8">No trips yet. Create one to get started.</p>
        )}

        {trips.map((trip) => (
          <div
            key={trip.id}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {trip.purpose?.trim() || 'Trip'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{formatRange(trip.startDate, trip.endDate)}</p>
              {trip._count && (
                <p className="text-xs text-gray-400 mt-1">
                  {trip._count.tripDays} day{trip._count.tripDays !== 1 ? 's' : ''} ·{' '}
                  {trip._count.destinations} destination{trip._count.destinations !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/trip/${trip.id}`}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Open
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
