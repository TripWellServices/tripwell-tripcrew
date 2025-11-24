'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

interface Traveler {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  tripsOwned: Array<{ id: string; name: string }>
}

export default function WelcomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [traveler, setTraveler] = useState<Traveler | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/splash')
        return
      }

      // Hydrate Traveler from Firebase
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
          setTraveler(data.traveler)
        } else {
          setError('Failed to load your account')
        }
      } catch (err) {
        console.error('Hydrate error:', err)
        setError('Failed to load your account')
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
            href="/splash"
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome{displayName ? `, ${displayName}` : ''}!
          </h1>
          <p className="text-gray-600">Your TripWell Trip Crew</p>
        </div>

        {traveler && traveler.tripsOwned.length > 0 ? (
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Trips</h2>
            {traveler.tripsOwned.map((trip) => (
              <Link
                key={trip.id}
                href={`/trip/${trip.id}?admin=1`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <h3 className="font-semibold text-gray-800">{trip.name}</h3>
                <p className="text-sm text-gray-600">Click to view and edit</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600 mb-4">You don't have any trips yet.</p>
            <p className="text-sm text-gray-500">Create your first trip to get started!</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/trip/setup"
            className="flex-1 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition text-center"
          >
            Create New Trip
          </Link>
          <button
            onClick={() => auth.signOut()}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

