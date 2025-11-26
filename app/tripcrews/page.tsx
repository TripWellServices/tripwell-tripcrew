/**
 * TripCrews List Page
 * 
 * Shows all TripCrews the traveler belongs to
 * Provides create-or-join fork UI
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getTravelerTripCrews, joinTripCrew } from '@/lib/actions/tripcrew'
import { LocalStorageAPI } from '@/lib/localStorage'
import Link from 'next/link'
import { format } from 'date-fns'

export default function TripCrewsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [tripCrews, setTripCrews] = useState<any[]>([])
  const [error, setError] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/')
        return
      }

      // Get Traveler ID from localStorage
      const storedTravelerId = LocalStorageAPI.getTravelerId()
      const storedTripCrews = LocalStorageAPI.getTripCrewMemberships()

      // If we have cached TripCrews, use them instantly
      if (storedTripCrews && storedTripCrews.length > 0 && storedTravelerId) {
        console.log('✅ TRIPCREWS: Using cached TripCrews from localStorage')
        setTravelerId(storedTravelerId)
        setTripCrews(storedTripCrews.map((m: any) => m.tripCrew))
        setLoading(false)
        // Still fetch fresh data in background
        loadTripCrews(storedTravelerId)
        return
      }

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
              LocalStorageAPI.setFullHydrationModel(data.traveler)
              loadTripCrews(travelerId)
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
      }
    })

    return () => unsubscribe()
  }, [router])

  const loadTripCrews = async (id: string) => {
    try {
      const result = await getTravelerTripCrews(id)
      if (result.success) {
        const crews = result.tripCrews || []
        setTripCrews(crews)
        // Store in localStorage for instant navigation
        const traveler = LocalStorageAPI.getTraveler()
        if (traveler) {
          LocalStorageAPI.setTripCrewMemberships(
            crews.map((crew: any) => ({ tripCrew: crew }))
          )
        }
      } else {
        setError(result.error || 'Failed to load TripCrews')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load TripCrews')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!travelerId || !joinCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setJoining(true)
    setError('')

    try {
      const result = await joinTripCrew(joinCode.trim(), travelerId)
      if (result.success && result.tripCrewId) {
        router.push(`/tripcrews/${result.tripCrewId}`)
      } else {
        setError(result.error || 'Failed to join TripCrew')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join TripCrew')
    } finally {
      setJoining(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My TripCrews</h1>
          <p className="text-white/80">Manage your trip planning crews</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Existing TripCrews List */}
        {tripCrews.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Your Crews</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tripCrews.map((crew) => (
                <Link
                  key={crew.id}
                  href={`/tripcrews/${crew.id}`}
                  className="block bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{crew.name}</h3>
                  {crew.description && (
                    <p className="text-gray-600 text-sm mb-4">{crew.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{crew._count?.trips || 0} trips</span>
                    <span>{crew._count?.memberships || 0} members</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Create-or-Join Fork */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Crew Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Create a Crew</h2>
              <p className="text-gray-600">Start a new TripCrew and invite others to join</p>
            </div>
            <Link
              href="/tripcrews/new"
              className="block w-full px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition text-center"
            >
              Create TripCrew
            </Link>
          </div>

          {/* Join Crew Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Join a Crew</h2>
              <p className="text-gray-600">Enter an invite code to join an existing TripCrew</p>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter invite code"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
              <button
                type="submit"
                disabled={joining || !travelerId}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {joining ? 'Joining...' : 'Join TripCrew'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
