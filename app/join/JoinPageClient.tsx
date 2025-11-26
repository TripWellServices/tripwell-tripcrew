/**
 * Join Page Client Component
 * 
 * Handles client-side auth and join action
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { joinTripCrew } from '@/lib/actions/tripcrew'
import Link from 'next/link'

interface JoinPageClientProps {
  code: string
  tripCrew: {
    id: string
    name: string
    description?: string
    memberCount: number
    tripCount: number
    admin: {
      firstName: string
      lastName: string
      photoURL?: string
    } | null
  }
}

export default function JoinPageClient({ code, tripCrew }: JoinPageClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsAuthenticated(!!firebaseUser)

      if (firebaseUser) {
        // Get Traveler ID from localStorage
        if (typeof window !== 'undefined') {
          const storedTravelerId = localStorage.getItem('travelerId')
          if (storedTravelerId) {
            setTravelerId(storedTravelerId)
            setLoading(false)
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
                setTravelerId(data.traveler.id)
                localStorage.setItem('travelerId', data.traveler.id)
              }
            } catch (err) {
              console.error('Error hydrating:', err)
            } finally {
              setLoading(false)
            }
          }
        }
      } else {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const handleJoin = async () => {
    if (!travelerId) {
      router.push(`/signup?redirect=/join?code=${code}`)
      return
    }

    setJoining(true)
    setError('')

    try {
      const result = await joinTripCrew({ inviteCode: code, travelerId })
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
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L12 21L16 22V20.5L14 19V13.5L22 16Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">You're Invited!</h1>
          <p className="text-gray-600">Join this TripCrew to start planning adventures together</p>
        </div>

        {/* TripCrew Preview Card */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{tripCrew.name}</h2>
          {tripCrew.description && (
            <p className="text-gray-600 text-sm mb-4">{tripCrew.description}</p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{tripCrew.memberCount} members</span>
            <span>{tripCrew.tripCount} trips</span>
          </div>
          {tripCrew.admin && (
            <div className="mt-4 flex items-center space-x-2">
              {tripCrew.admin.photoURL && (
                <img
                  src={tripCrew.admin.photoURL}
                  alt={tripCrew.admin.firstName}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-600">
                Admin: {tripCrew.admin.firstName} {tripCrew.admin.lastName}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {isAuthenticated ? (
          <button
            onClick={handleJoin}
            disabled={joining || !travelerId}
            className="w-full px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Join This TripCrew'}
          </button>
        ) : (
          <div className="space-y-3">
            <Link
              href={`/signup?redirect=/join?code=${code}`}
              className="block w-full px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition text-center"
            >
              Sign Up to Join
            </Link>
            <Link
              href={`/signin?redirect=/join?code=${code}`}
              className="block w-full px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition text-center"
            >
              Sign In to Join
            </Link>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/tripcrews"
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Back to TripCrews
          </Link>
        </div>
      </div>
    </div>
  )
}

