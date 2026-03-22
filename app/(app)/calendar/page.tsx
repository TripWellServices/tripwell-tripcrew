'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

interface CalendarTrip {
  id: string
  tripName: string
  dateRange: string
  startDate: string
  endDate: string
  city?: string | null
  state?: string | null
  country?: string | null
  status?: string
  crew?: { id: string; name: string | null } | null
}

export default function CalendarPage() {
  const router = useRouter()
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [trips, setTrips] = useState<CalendarTrip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/')
        return
      }
      try {
        const res = await fetch(`/api/auth/hydrate?firebaseId=${user.uid}`)
        const data = await res.json()
        const tid = data.traveler?.id ?? null
        setTravelerId(tid)
        if (tid && typeof window !== 'undefined') {
          localStorage.setItem('travelerId', tid)
        }
      } catch {
        setTravelerId(null)
      }
    })
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (!travelerId) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(
      `/api/traveler/trips?travelerId=${encodeURIComponent(travelerId)}&scope=all`
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTrips(data)
        else setTrips([])
      })
      .catch(() => setTrips([]))
      .finally(() => setLoading(false))
  }, [travelerId])

  const sorted = useMemo(() => {
    return [...trips].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )
  }, [trips])

  if (loading && !travelerId) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Calendar</h1>
      <p className="text-gray-500 text-sm mb-6">
        Your trips in chronological order. Start something new from the{' '}
        <Link href="/plan" className="text-sky-600 font-medium hover:underline">
          Planner
        </Link>
        .
      </p>

      {loading ? (
        <p className="text-gray-500 text-sm py-8">Loading trips…</p>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-600 text-sm mb-4">No trips yet.</p>
          <Link
            href="/plan"
            className="inline-flex px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700"
          >
            Open Planner
          </Link>
        </div>
      ) : (
        <ol className="space-y-3">
          {sorted.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trip/${trip.id}/admin`}
                className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-sky-200 hover:bg-sky-50/30 transition"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold text-gray-900">{trip.tripName}</h2>
                  <time className="text-sm text-gray-500 tabular-nums">{trip.dateRange}</time>
                </div>
                {trip.city && trip.country && (
                  <p className="text-xs text-gray-500 mt-1">
                    {trip.city}
                    {trip.state ? `, ${trip.state}` : ''}, {trip.country}
                  </p>
                )}
                {trip.crew?.name && (
                  <p className="text-xs text-sky-600 mt-1">{trip.crew.name}</p>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
