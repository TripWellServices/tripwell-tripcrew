/**
 * Travel Cockpit — primary dashboard after auth.
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { postHydrateTraveler } from '@/lib/hydrateTravelerClient'
import { LocalStorageAPI } from '@/lib/localStorage'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'
import { concertsIngestPath, tripSetupIngestPath } from '@/lib/experience-routes'

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

interface PersonalTrip {
  id: string
  tripName: string
  city: string | null
  state: string | null
  country: string | null
  dateRange: string | null
  startDate: string | Date
  endDate: string | Date
  crewId?: string | null
}

export default function TravelCockpitPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tripCrews, setTripCrews] = useState<TripCrew[]>([])
  const [personalTrips, setPersonalTrips] = useState<PersonalTrip[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/')
        return
      }

      const storedTravelerId = LocalStorageAPI.getTravelerId()
      if (storedTravelerId) {
        void loadDashboard(storedTravelerId)
      } else {
        try {
          const response = await postHydrateTraveler(firebaseUser, {
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            picture: firebaseUser.photoURL,
          })
          if (response.ok) {
            const data = await response.json()
            const hydrated = data.traveler
            const tid = hydrated?.id ?? null
            if (tid && hydrated) {
              LocalStorageAPI.setFullHydrationModel(hydrated)
              void loadDashboard(tid)
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

  async function loadDashboard(tid: string) {
    setError(null)
    try {
      const [crewRes, tripsRes] = await Promise.all([
        fetch(`/api/tripcrew?travelerId=${tid}`),
        fetch(`/api/traveler/trips?travelerId=${encodeURIComponent(tid)}`),
      ])
      if (!crewRes.ok) {
        const data = await crewRes.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load TripCrews')
      }
      if (!tripsRes.ok) {
        const data = await tripsRes.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load trips')
      }
      const data = await crewRes.json()
      setTripCrews(data.tripCrews || [])
      const trips = await tripsRes.json()
      setPersonalTrips(Array.isArray(trips) ? trips : [])
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const personalTripsOnly = useMemo(
    () => personalTrips.filter((trip) => !trip.crewId),
    [personalTrips]
  )

  const crewTripIds = useMemo(() => {
    const ids = new Set<string>()
    tripCrews.forEach((crew) => {
      ;(crew.trips || []).forEach((trip) => ids.add(trip.id))
    })
    return ids
  }, [tripCrews])

  const upcomingCrewTrips = useMemo(() => {
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

  const upcomingPersonalTrips = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return personalTripsOnly
      .filter((trip) => {
        if (crewTripIds.has(trip.id)) return false
        if (!trip.endDate) return true
        const end = new Date(trip.endDate)
        end.setHours(0, 0, 0, 0)
        return end >= today
      })
      .sort((a, b) => {
        if (!a.startDate) return 1
        if (!b.startDate) return -1
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      })
  }, [personalTripsOnly, crewTripIds])

  const pastPersonalTripsCount = personalTripsOnly.length - upcomingPersonalTrips.length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 py-24">
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
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Upcoming trips and planning at a glance</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col min-h-[180px]">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            My upcoming trips
          </h2>
          {upcomingPersonalTrips.length === 0 ? (
            <div className="flex-1 text-sm text-gray-600">
              {personalTripsOnly.length === 0 ? (
                <p>No personal trips yet.</p>
              ) : (
                <>
                  <p>No upcoming personal trips.</p>
                  <p className="text-gray-500 mt-1">
                    {pastPersonalTripsCount}{' '}
                    {pastPersonalTripsCount === 1 ? 'past trip' : 'past trips'} on your account.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-2 flex-1">
              {upcomingPersonalTrips.slice(0, 4).map((trip) => (
                <li key={trip.id}>
                  <Link
                    href={`/trip/${trip.id}/admin`}
                    className="block rounded-lg border border-gray-100 p-3 hover:border-sky-200 hover:bg-sky-50/50 transition"
                  >
                    <h3 className="font-medium text-gray-900 text-sm">{trip.tripName}</h3>
                    {trip.city ? (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {trip.city}
                        {trip.state ? `, ${trip.state}` : ''}
                        {trip.country ? `, ${trip.country}` : ''}
                      </p>
                    ) : null}
                    {trip.dateRange ? (
                      <p className="text-xs text-gray-400 mt-1">{trip.dateRange}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/my-trips"
            className="mt-4 text-sm text-sky-600 font-medium hover:underline w-fit"
          >
            View all trips
          </Link>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col min-h-[180px]">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            TripCrew trips
          </h2>
          {upcomingCrewTrips.length === 0 ? (
            <p className="text-gray-600 text-sm flex-1">
              {tripCrews.some((c) => (c._count?.trips ?? 0) > 0)
                ? 'No upcoming crew trips on the calendar.'
                : 'No crew trips on the calendar yet.'}
            </p>
          ) : (
            <ul className="space-y-2 flex-1">
              {upcomingCrewTrips.slice(0, 4).map(({ trip, crewName }) => (
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
          <Link
            href="/tripcrews"
            className="mt-4 text-sm text-sky-600 font-medium hover:underline w-fit"
          >
            Open TripCrews
          </Link>
        </section>
      </div>

      {upcomingPersonalTrips.length === 0 &&
      upcomingCrewTrips.length === 0 &&
      personalTripsOnly.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          <Link href={tripSetupIngestPath()} className="text-sky-600 font-medium hover:underline">
            Start a trip
          </Link>
          {' '}or plan around a concert via{' '}
          <Link href={concertsIngestPath()} className="text-sky-600 font-medium hover:underline">
            Experiences → Concerts
          </Link>
          .
        </p>
      ) : null}
    </div>
  )
}
