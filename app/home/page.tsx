/**
 * Traveler Home Page
 * 
 * Main dashboard after authentication
 * Shows all TripCrews, recent trips, and quick actions
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'
import { format } from 'date-fns'

interface TripCrew {
  id: string
  name: string
  description: string | null
  trips: Array<{
    id: string
    name: string
    destination: string | null
    startDate: string | null
    endDate: string | null
  }>
  _count: {
    memberships: number
    trips: number
  }
}

export default function TravelerHomePage() {
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

      // Get travelerId from localStorage
      if (typeof window !== 'undefined') {
        const storedTravelerId = localStorage.getItem('travelerId')
        if (storedTravelerId) {
          setTravelerId(storedTravelerId)
          loadTripCrews(storedTravelerId)
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
              localStorage.setItem('travelerId', travelerId)
              loadTripCrews(travelerId)
            }
          } catch (err) {
            console.error('Error hydrating:', err)
            setError('Failed to load your account')
          } finally {
            setLoading(false)
          }
        }
      }
    })

    return () => unsubscribe()
  }, [router])

  const loadTripCrews = async (travelerId: string) => {
    try {
      // TODO: Use server action or API route
      // For now, fetch from API
      const response = await fetch(`/api/tripcrew?travelerId=${travelerId}`)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">TripWell Home</h1>
              <p className="text-white/80">Your trip planning dashboard</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/profile/settings"
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition"
              >
                Settings
              </Link>
              <Link
                href="/tripcrews/new"
                className="px-6 py-2 bg-white text-sky-600 font-semibold rounded-lg hover:bg-sky-50 transition shadow-lg"
              >
                + Create TripCrew
              </Link>
            </div>
          </div>

          {/* TripCrews Section */}
          {tripCrews.length === 0 ? (
            <div className="bg-white/90 rounded-lg shadow-xl p-12 text-center">
              <div className="mb-6">
                <svg
                  className="w-24 h-24 mx-auto text-sky-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">No TripCrews Yet</h2>
              <p className="text-gray-600 mb-6">
                Create your first TripCrew to start planning trips with your crew!
              </p>
              <Link
                href="/tripcrews/new"
                className="inline-block px-8 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition shadow-lg"
              >
                Create Your First TripCrew
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tripCrews.map((crew) => (
                <Link
                  key={crew.id}
                  href={`/tripcrews/${crew.id}`}
                  className="bg-white rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition"
                >
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{crew.name}</h3>
                    {crew.description && (
                      <p className="text-gray-600 text-sm mb-4">{crew.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{crew._count.memberships} member{crew._count.memberships !== 1 ? 's' : ''}</span>
                      <span>{crew._count.trips} trip{crew._count.trips !== 1 ? 's' : ''}</span>
                    </div>
                    {crew.trips.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Recent Trips</p>
                        {crew.trips.slice(0, 2).map((trip) => (
                          <div key={trip.id} className="text-sm text-gray-700 mb-1">
                            {trip.name}
                            {trip.destination && (
                              <span className="text-gray-500"> • {trip.destination}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

