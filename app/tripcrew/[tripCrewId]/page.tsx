'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

interface Trip {
  id: string
  name: string
  destination: string | null
  startDate: string | null
  endDate: string | null
  coverImage: string | null
}

interface TripCrew {
  id: string
  name: string
  description: string | null
  trips: Trip[]
}

export default function TripCrewPage() {
  const router = useRouter()
  const params = useParams()
  const tripCrewId = params.tripCrewId as string

  const [loading, setLoading] = useState(true)
  const [tripCrew, setTripCrew] = useState<TripCrew | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddTrip, setShowAddTrip] = useState(false)
  const [newTripName, setNewTripName] = useState('')
  const [newTripDestination, setNewTripDestination] = useState('')
  const [addingTrip, setAddingTrip] = useState(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/splash')
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    const loadTripCrew = async () => {
      try {
        const response = await fetch(`/api/tripcrew/${tripCrewId}`)
        if (response.ok) {
          const data = await response.json()
          setTripCrew(data.tripCrew)
        } else {
          setError('Failed to load TripCrew')
        }
      } catch (err) {
        setError('Failed to load TripCrew')
      } finally {
        setLoading(false)
      }
    }

    if (tripCrewId) {
      loadTripCrew()
    }
  }, [tripCrewId])

  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTripName.trim()) return

    setAddingTrip(true)
    try {
      const response = await fetch(`/api/tripcrew/${tripCrewId}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTripName,
          destination: newTripDestination || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Reload trip crew
        const reloadResponse = await fetch(`/api/tripcrew/${tripCrewId}`)
        if (reloadResponse.ok) {
          const reloadData = await reloadResponse.json()
          setTripCrew(reloadData.tripCrew)
        }
        setNewTripName('')
        setNewTripDestination('')
        setShowAddTrip(false)
      } else {
        setError('Failed to add trip')
      }
    } catch (err) {
      setError('Failed to add trip')
    } finally {
      setAddingTrip(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-sky-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading TripCrew...</p>
        </div>
      </div>
    )
  }

  if (error || !tripCrew) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'TripCrew not found'}</p>
          <Link href="/welcome" className="text-sky-600 hover:underline">
            Go back
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{tripCrew.name}</h1>
          {tripCrew.description && (
            <p className="text-gray-600">{tripCrew.description}</p>
          )}
        </div>

        {/* Add Trip Button */}
        <div className="mb-6">
          {!showAddTrip ? (
            <button
              onClick={() => setShowAddTrip(true)}
              className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
            >
              + Add Trip
            </button>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Add New Trip</h2>
              <form onSubmit={handleAddTrip} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trip Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    placeholder="e.g., Thanksgiving 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={newTripDestination}
                    onChange={(e) => setNewTripDestination(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    placeholder="e.g., Richlands, VA"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={addingTrip}
                    className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
                  >
                    {addingTrip ? 'Adding...' : 'Add Trip'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTrip(false)
                      setNewTripName('')
                      setNewTripDestination('')
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Trips Grid */}
        {tripCrew.trips.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">No trips yet. Add your first trip above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tripCrew.trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/trip/${trip.id}?admin=1`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
              >
                {trip.coverImage ? (
                  <img
                    src={trip.coverImage}
                    alt={trip.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-sky-400 to-blue-500"></div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{trip.name}</h3>
                  {trip.destination && (
                    <p className="text-gray-600 mb-2">📍 {trip.destination}</p>
                  )}
                  {trip.startDate && trip.endDate && (
                    <p className="text-sm text-gray-500">
                      {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


