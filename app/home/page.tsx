/**
 * Travel Cockpit (Planner Dashboard)
 *
 * Primary landing after auth. Shows Upcoming trips and Keep planning.
 * Crews are a secondary surface; back links from crew context go here.
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

interface Trip {
  id: string
  tripName: string
  city: string | null
  state: string | null
  country: string
  dateRange: string | null
  startDate: Date | string | null
  endDate: Date | string | null
}

interface TripCrew {
  id: string
  name: string | null
  trips: Trip[]
  _count: { memberships: number; trips: number }
}

export default function TravelCockpitPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tripCrews, setTripCrews] = useState<TripCrew[]>([])
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/')
        return
      }

      const storedTravelerId =
        typeof window !== 'undefined' ? localStorage.getItem('travelerId') : null
      if (storedTravelerId) {
        setTravelerId(storedTravelerId)
        loadTripCrews(storedTravelerId)
      } else {
        try {
          const response = await fetch('/api/auth/hydrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firebaseId: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              picture: firebaseUser.photoURL,
            }),
          })
          if (response.ok) {
            const data = await response.json()
            const tid = data.traveler?.id ?? null
            setTravelerId(tid)
            if (tid) {
              if (typeof window !== 'undefined') localStorage.setItem('travelerId', tid)
              loadTripCrews(tid)
            }
          } else {
            setError('Failed to load your account')
          }
        } catch (err) {
          console.error('Error hydrating:', err)
          setError('Failed to load your account')
        } finally {
          setLoading(false)
        }
      }
    })
    return () => unsubscribe()
  }, [router])

  const loadTripCrews = async (tid: string) => {
    try {
      const response = await fetch(`/api/tripcrew?travelerId=${tid}`)
      if (response.ok) {
        const data = await response.json()
        setTripCrews(data.tripCrews || [])
      }
    } catch (err) {
      console.error('Error loading TripCrews:', err)
    } finally {
      setLoading(false)
    }
  }

  const upcomingTrips = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const all: Array<{ trip: Trip; crewName: string | null }> = []
    tripCrews.forEach((crew) => {
      ;(crew.trips || []).forEach((trip: Trip) => {
        if (!trip.endDate) {
          all.push({ trip, crewName: crew.name })
          return
        }
        const endDate = new Date(trip.endDate)
        endDate.setHours(0, 0, 0, 0)
        if (endDate >= today) all.push({ trip, crewName: crew.name })
      })
    })
    all.sort((a, b) => {
      if (!a.trip.startDate) return 1
      if (!b.trip.startDate) return -1
      return new Date(a.trip.startDate).getTime() - new Date(b.trip.startDate).getTime()
    })
    return all
  }, [tripCrews])

  const firstCrewId = tripCrews.length === 1 ? tripCrews[0].id : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4" />
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/welcome" className="text-sky-600 hover:underline">
            Go back
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Travel cockpit</h1>
              <p className="text-white/90 text-sm">Your planning dashboard</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/profile/settings"
                className="px-3 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 text-sm"
              >
                Settings
              </Link>
              <Link
                href="/tripcrews"
                className="px-3 py-2 text-white/90 hover:text-white text-sm font-medium"
              >
                Crews
              </Link>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-sm mb-8">
            <Link
              href="/traveler/plans"
              className="text-white/90 hover:text-white font-medium"
            >
              My Plans
            </Link>
            <span className="text-white/50">·</span>
            {firstCrewId ? (
              <Link
                href={`/tripcrews/${firstCrewId}/discover`}
                className="text-white/90 hover:text-white font-medium"
              >
                Add experiences
              </Link>
            ) : (
              <Link
                href="/tripcrews"
                className="text-white/90 hover:text-white font-medium"
              >
                Add experiences
              </Link>
            )}
            <span className="text-white/50">·</span>
            <Link
              href="/tripcrews"
              className="text-white/90 hover:text-white font-medium"
            >
              Crews
            </Link>
          </nav>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-3">Upcoming trips</h2>
            {upcomingTrips.length === 0 ? (
              <div className="bg-white/95 rounded-xl shadow-lg p-6 border border-white/20">
                <p className="text-gray-600">No upcoming trips. Start one from My Plans or a crew.</p>
                <Link
                  href="/traveler/plans"
                  className="inline-block mt-3 text-sky-600 font-medium hover:underline"
                >
                  My Plans →
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {upcomingTrips.map(({ trip, crewName }) => (
                  <li key={trip.id}>
                    <Link
                      href={`/trip/${trip.id}/admin`}
                      className="block bg-white/95 rounded-xl shadow-lg p-4 border border-white/20 hover:shadow-xl transition"
                    >
                      <h3 className="font-semibold text-gray-800">{trip.tripName}</h3>
                      {trip.city && trip.country && (
                        <p className="text-sm text-gray-600 mt-0.5">
                          {trip.city}
                          {trip.state ? `, ${trip.state}` : ''}, {trip.country}
                        </p>
                      )}
                      {trip.dateRange && (
                        <p className="text-xs text-gray-500 mt-1">{trip.dateRange}</p>
                      )}
                      {crewName && (
                        <p className="text-xs text-sky-600 mt-1">{crewName}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Keep planning</h2>
            <div className="bg-white/95 rounded-xl shadow-lg p-6 border border-white/20">
              <p className="text-gray-800 font-medium mb-2">Start a trip</p>
              <p className="text-gray-500 text-sm mb-4">
                Pick from your list or start from a city or event.
              </p>
              {firstCrewId ? (
                <Link
                  href={`/tripcrews/${firstCrewId}/plan`}
                  className="inline-block px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 transition"
                >
                  Start a trip →
                </Link>
              ) : (
                <Link
                  href="/traveler/plans"
                  className="inline-block px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 transition"
                >
                  My Plans →
                </Link>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
