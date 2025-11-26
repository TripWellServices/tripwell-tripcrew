'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

interface TripCrew {
  id: string
  name: string
  trips: Array<{ id: string; name: string }>
}

interface TripCrewMembership {
  tripCrew: TripCrew
}

interface Traveler {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  tripCrewMemberships: TripCrewMembership[]
}

export default function WelcomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [traveler, setTraveler] = useState<Traveler | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/')
        return
      }

      // Hydrate Traveler from Firebase
      try {
        console.log('🔄 WELCOME: Hydrating traveler for firebaseId:', firebaseUser.uid)
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

        console.log('🔄 WELCOME: Response status:', response.status)

        if (response.ok) {
          const data = await response.json()
          console.log('✅ WELCOME: Traveler hydrated:', data.traveler?.id)
          setTraveler(data.traveler)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('❌ WELCOME: Hydrate failed:', errorData)
          setError(errorData.error || 'Failed to load your account')
        }
      } catch (err: any) {
        console.error('❌ WELCOME: Hydrate error:', err)
        setError(err.message || 'Failed to load your account')
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

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
          <Link
            href="/"
            className="text-sky-600 hover:underline"
          >
            Go back
          </Link>
        </div>
      </div>
    )
  }

  const displayName = traveler?.firstName || traveler?.email || 'Traveler'

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome{displayName ? `, ${displayName}` : ''}!
            </h1>
            <p className="text-gray-600">Your TripWell Home</p>
          </div>
          <Link
            href="/profile/settings"
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Settings
          </Link>
        </div>

        {/* Profile Info Card */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Profile Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="text-gray-900 font-medium">
                {traveler?.firstName && traveler?.lastName
                  ? `${traveler.firstName} ${traveler.lastName}`
                  : traveler?.firstName || traveler?.email || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="text-gray-900">{traveler?.email || 'Not set'}</span>
            </div>
            {traveler?.photoUrl && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Photo:</span>
                <img
                  src={traveler.photoUrl}
                  alt="Profile"
                  className="w-10 h-10 rounded-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* TripCrews Section - Only show if they have any */}
        {traveler && traveler.tripCrewMemberships.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your TripCrews</h2>
            {traveler.tripCrewMemberships.map((membership) => (
              <Link
                key={membership.tripCrew.id}
                href={`/tripcrew/${membership.tripCrew.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <h3 className="font-semibold text-gray-800">{membership.tripCrew.name}</h3>
                <p className="text-sm text-gray-600">
                  {membership.tripCrew.trips.length} trip{membership.tripCrew.trips.length !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          {(!traveler || traveler.tripCrewMemberships.length === 0) && (
            <Link
              href="/tripcrew/setup"
              className="flex-1 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition text-center"
            >
              Create TripCrew
            </Link>
          )}
          <button
            onClick={() => {
              const auth = getFirebaseAuth()
              auth.signOut()
            }}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

