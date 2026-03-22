/**
 * TripCrew Admin Client Component
 * 
 * Handles client-side auth and data fetching for TripCrew admin page
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getTripCrew } from '@/lib/actions/tripcrew'
import { LocalStorageAPI } from '@/lib/localStorage'
import Link from 'next/link'
import { format } from 'date-fns'
import CreateTripModal from '@/components/trip/CreateTripModal'

interface TripCrewAdminClientProps {
  tripCrewId: string
}

export default function TripCrewAdminClient({ tripCrewId }: TripCrewAdminClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [tripCrew, setTripCrew] = useState<any>(null)
  const [error, setError] = useState('')
  const [showCreateTripModal, setShowCreateTripModal] = useState(false)
  const [navView, setNavView] = useState<'trips' | 'past'>('trips')

  // Note: loadInviteLink moved to layout.tsx

  const loadTripCrew = useCallback(async (id: string) => {
    try {
      const result = await getTripCrew(tripCrewId, id)
      if (result.success && result.tripCrew) {
        setTripCrew(result.tripCrew)
        // Store in localStorage for instant navigation next time
        LocalStorageAPI.setTripCrewId(result.tripCrew.id)
        LocalStorageAPI.setTripCrewData(result.tripCrew)
        console.log('✅ TRIPCREW ADMIN: Stored TripCrew data to localStorage')
        
        // Note: Invite link handling moved to layout.tsx
      } else {
        setError(result.error || 'Failed to load TripCrew')
        // If not a member, redirect to dashboard
        if (result.error?.includes('Not a member')) {
          router.push('/home')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load TripCrew')
    } finally {
      setLoading(false)
    }
  }, [tripCrewId, router])

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/')
        return
      }

      // Get Traveler ID from localStorage
      const storedTravelerId = LocalStorageAPI.getTravelerId()
      const storedTripCrewData = LocalStorageAPI.getTripCrewData()

      // If we have cached TripCrew data and it matches the current tripCrewId, use it instantly
      if (storedTripCrewData && storedTripCrewData.id === tripCrewId && storedTravelerId) {
        console.log('✅ TRIPCREW ADMIN: Using cached TripCrew data from localStorage')
        setTravelerId(storedTravelerId)
        setTripCrew(storedTripCrewData)
        setLoading(false)
        // Still fetch fresh data in background
        if (storedTravelerId) {
          loadTripCrew(storedTravelerId)
        }
        return
      }

      // Otherwise, hydrate and fetch
      if (storedTravelerId) {
        setTravelerId(storedTravelerId)
        loadTripCrew(storedTravelerId)
      } else {
        // Hydrate if not in localStorage
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
            const travelerId = data.traveler.id
            setTravelerId(travelerId)
            LocalStorageAPI.setFullHydrationModel(data.traveler)
            loadTripCrew(travelerId)
          } else {
            setError('Failed to load your account')
            setLoading(false)
          }
        } catch (err) {
          console.error('Error hydrating:', err)
          setError('Failed to load your account')
          setLoading(false)
        }
      }
    })

    return () => unsubscribe()
  }, [router, tripCrewId, loadTripCrew])


  // Note: handleCopyInvite moved to layout.tsx

  // Trip date logic: past = endDate < today (start of day); upcoming = endDate >= today or no endDate
  const categorizedTrips = useMemo(() => {
    if (!tripCrew?.trips) return { upcoming: [], past: [] }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const upcoming: any[] = []
    const past: any[] = []
    
    tripCrew.trips.forEach((trip: any) => {
      if (!trip.endDate) {
        upcoming.push(trip)
        return
      }
      
      const endDate = new Date(trip.endDate)
      endDate.setHours(0, 0, 0, 0)
      
      if (endDate >= today) {
        upcoming.push(trip)
      } else {
        past.push(trip)
      }
    })
    
    // Sort upcoming by startDate (earliest first), past by endDate (most recent first)
    upcoming.sort((a, b) => {
      if (!a.startDate) return 1
      if (!b.startDate) return -1
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    })
    
    past.sort((a, b) => {
      if (!a.endDate) return 1
      if (!b.endDate) return -1
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    })
    
    return { upcoming, past }
  }, [tripCrew?.trips])

  // New modal handles trip creation internally

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-sky-600 mx-auto mb-4" />
          <p className="text-gray-600 text-xl">Loading TripCrew...</p>
        </div>
      </div>
    )
  }

  if (error && !tripCrew) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/home"
            className="text-sky-600 hover:underline"
          >
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!tripCrew) {
    return null
  }

  // Note: isAdmin and invite handling moved to layout.tsx

  const tripCard = (trip: any, faded?: boolean) => (
    <Link
      key={trip.id}
      href={`/trip/${trip.id}/admin`}
      className={`block p-4 border border-gray-200 rounded-xl hover:border-sky-300 hover:shadow-md transition ${faded ? 'opacity-75' : ''}`}
    >
      <h4 className="text-lg font-semibold text-gray-800 mb-2">{trip.tripName}</h4>
      {trip.city && trip.country && (
        <p className="text-sm text-gray-600 mb-2">
          📍 {trip.city}{trip.state ? `, ${trip.state}` : ''}, {trip.country}
        </p>
      )}
      {trip.dateRange && <p className="text-xs text-gray-500">{trip.dateRange}</p>}
    </Link>
  )

  // TripCrewChrome + AppShell from parent layout.tsx
  // This component now only handles the main content area
  return (
    <>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {navView === 'past' ? (
          /* Past trips: secondary view from nav */
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Past trips</h2>
            {categorizedTrips.past.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categorizedTrips.past.map((trip: any) => tripCard(trip, true))}
              </div>
            ) : (
              <p className="text-gray-500">No past trips.</p>
            )}
          </div>
        ) : (
          /* Default: My Trips — current/upcoming focus */
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">My Trips</h2>
              <div className="flex gap-2">
                <Link
                  href="/plan"
                  className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition text-sm"
                >
                  Start a Trip
                </Link>
                <button
                  onClick={() => setShowCreateTripModal(true)}
                  className="px-4 py-2 bg-sky-100 text-sky-700 font-semibold rounded-lg hover:bg-sky-200 transition text-sm"
                >
                  Create Trip
                </button>
              </div>
            </div>

            {tripCrew.trips && tripCrew.trips.length > 0 ? (
              <>
                {categorizedTrips.upcoming.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Upcoming and current trips</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {categorizedTrips.upcoming.map((trip: any) => tripCard(trip))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-gray-500 mb-4">No upcoming trips. Plan or create one.</p>
                    <div className="flex justify-center gap-3">
                      <Link
                        href="/plan"
                        className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700"
                      >
                        Start a Trip
                      </Link>
                      <button
                        onClick={() => setShowCreateTripModal(true)}
                        className="px-4 py-2 bg-sky-100 text-sky-700 font-semibold rounded-lg hover:bg-sky-200"
                      >
                        Create Trip
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center">
                <p className="text-gray-600 mb-4">No trips yet. Plan or create your first trip.</p>
                <button
                  onClick={() => setShowCreateTripModal(true)}
                  className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
                >
                  Create Your First Trip
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateTripModal && travelerId && (
        <CreateTripModal
          tripCrew={tripCrew}
          travelerId={travelerId}
          onClose={() => setShowCreateTripModal(false)}
        />
      )}
    </>
  )
}

