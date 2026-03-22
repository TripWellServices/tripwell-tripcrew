/**
 * Travel Cockpit (Planner Dashboard)
 *
 * Primary landing after auth. Left nav + card-based content (upcoming trips, keep planning).
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [tripCrews, setTripCrews] = useState<TripCrew[]>([])
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

  const navLink = (href: string, label: string, prefixMatch = false) => {
    const active = prefixMatch ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href
    return (
      <Link
        href={href}
        className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
          active ? 'bg-sky-100 text-sky-800' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        {label}
      </Link>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/welcome" className="text-sky-600 font-medium hover:underline">
            Go back
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">TripWell</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">Travel cockpit</p>
        </div>
        <nav className="p-2 flex-1 space-y-0.5">
          {navLink('/home', 'Dashboard')}
          {navLink('/traveler/plans', 'My Plans')}
          {navLink('/traveler/destinations', 'Destinations', true)}
          <Link
            href="/traveler/experiences"
            className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
          >
            Experiences
          </Link>
          {navLink('/tripcrews', 'Crews')}
        </nav>
        <div className="p-2 border-t border-gray-100">
          <Link
            href="/profile/settings"
            className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Settings
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Travel cockpit</h1>
            <p className="text-gray-500 text-sm mt-1">Your planning dashboard</p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Upcoming trips card */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col min-h-[180px]">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Upcoming trips
              </h2>
              {upcomingTrips.length === 0 ? (
                <>
                  <p className="text-gray-600 text-sm flex-1">
                    No upcoming trips yet. Start one from My Plans or open a crew.
                  </p>
                  <Link
                    href="/traveler/plans"
                    className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition w-fit"
                  >
                    My Plans
                  </Link>
                </>
              ) : (
                <ul className="space-y-2 flex-1">
                  {upcomingTrips.slice(0, 4).map(({ trip, crewName }) => (
                    <li key={trip.id}>
                      <Link
                        href={`/trip/${trip.id}/admin`}
                        className="block rounded-lg border border-gray-100 p-3 hover:border-sky-200 hover:bg-sky-50/50 transition"
                      >
                        <h3 className="font-medium text-gray-900 text-sm">{trip.tripName}</h3>
                        {trip.city && trip.country && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {trip.city}
                            {trip.state ? `, ${trip.state}` : ''}, {trip.country}
                          </p>
                        )}
                        {trip.dateRange && (
                          <p className="text-xs text-gray-400 mt-1">{trip.dateRange}</p>
                        )}
                        {crewName && (
                          <p className="text-xs text-sky-600 mt-1">{crewName}</p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {upcomingTrips.length > 4 && (
                <p className="text-xs text-gray-400 mt-2">Showing 4 of {upcomingTrips.length}</p>
              )}
            </section>

            {/* Keep planning card */}
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col min-h-[180px]">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Keep planning
              </h2>
              <p className="text-gray-900 font-medium text-sm">Start a trip</p>
              <p className="text-gray-500 text-sm mt-1 flex-1">
                Pick from your list or start from a city or event.
              </p>
              <Link
                href="/traveler/experiences"
                className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition w-fit"
              >
                Start a trip
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
