/**
 * TripCrew Admin Client Component
 * 
 * Handles client-side auth and data fetching for TripCrew admin page
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getTripCrew, generateInviteLink } from '@/lib/actions/tripcrew'
import { createTrip } from '@/lib/actions/trip'
import { LocalStorageAPI } from '@/lib/localStorage'
import Link from 'next/link'
import { format } from 'date-fns'
import InviteMemberModal from './InviteMemberModal'
import CreateTripModal from './CreateTripModal'

interface TripCrewAdminClientProps {
  tripCrewId: string
}

export default function TripCrewAdminClient({ tripCrewId }: TripCrewAdminClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [tripCrew, setTripCrew] = useState<any>(null)
  const [error, setError] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showCreateTripModal, setShowCreateTripModal] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')

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
  }, [router, tripCrewId])

  const loadTripCrew = async (id: string) => {
    try {
      const result = await getTripCrew(tripCrewId, id)
      if (result.success && result.tripCrew) {
        setTripCrew(result.tripCrew)
        // Store in localStorage for instant navigation next time
        LocalStorageAPI.setTripCrewId(result.tripCrew.id)
        LocalStorageAPI.setTripCrewData(result.tripCrew)
        console.log('✅ TRIPCREW ADMIN: Stored TripCrew data to localStorage')
      } else {
        setError(result.error || 'Failed to load TripCrew')
        // If not a member, redirect to /tripcrews
        if (result.error?.includes('Not a member')) {
          router.push('/tripcrews')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load TripCrew')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateInvite = async () => {
    if (!travelerId) return

    try {
      const result = await generateInviteLink(tripCrewId, travelerId)
      if (result.success && result.inviteUrl) {
        setInviteUrl(result.inviteUrl)
        setShowInviteModal(true)
      } else {
        setError(result.error || 'Failed to generate invite link')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate invite link')
    }
  }

  const handleCreateTrip = async (tripData: {
    name: string
    destination?: string
    startDate?: Date
    endDate?: Date
  }) => {
    if (!travelerId) return { success: false, error: 'Not authenticated' }

    try {
      const result = await createTrip({
        ...tripData,
        tripCrewId,
        travelerId,
      })

      if (result.success && result.trip) {
        // Reload TripCrew data
        await loadTripCrew(travelerId)
        setShowCreateTripModal(false)
        // Redirect to trip admin page
        router.push(`/trip/${result.trip.id}/admin`)
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Failed to create trip' }
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create trip' }
    }
  }

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
            href="/tripcrews"
            className="text-sky-600 hover:underline"
          >
            Back to TripCrews
          </Link>
        </div>
      </div>
    )
  }

  if (!tripCrew) {
    return null
  }

  const isAdmin = tripCrew.roles?.some((r: any) => r.travelerId === travelerId && r.role === 'admin')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">{tripCrew.name}</h1>
            {tripCrew.description && (
              <p className="text-gray-600 mb-4">{tripCrew.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{tripCrew.memberships?.length || 0} members</span>
              <span>•</span>
              <span>{tripCrew.trips?.length || 0} trips</span>
            </div>
          </div>
          <Link
            href="/tripcrews"
            className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Back to TripCrews
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Members */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Members</h2>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {tripCrew.memberships?.length || 0}
                </span>
              </div>

              {tripCrew.memberships && tripCrew.memberships.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {tripCrew.memberships.map((membership: any) => {
                    const memberRole = tripCrew.roles?.find(
                      (r: any) => r.travelerId === membership.traveler.id
                    )
                    return (
                      <div key={membership.id} className="flex items-center space-x-3">
                        {membership.traveler.photoURL ? (
                          <img
                            src={membership.traveler.photoURL}
                            alt={membership.traveler.firstName || 'Member'}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 text-sm">
                              {membership.traveler.firstName?.[0] || '?'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {membership.traveler.firstName} {membership.traveler.lastName}
                          </p>
                          {memberRole && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                              {memberRole.role}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="mb-4 p-4 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500">
                  <p>No members yet.</p>
                  <p>Share your invite code to build the crew.</p>
                </div>
              )}

              {isAdmin && (
                <button
                  onClick={handleGenerateInvite}
                  className="w-full px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
                >
                  Invite Member
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Trips */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Trips</h2>
                <button
                  onClick={() => setShowCreateTripModal(true)}
                  className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
                >
                  Create Trip
                </button>
              </div>

              {tripCrew.trips && tripCrew.trips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tripCrew.trips.map((trip: any) => (
                    <Link
                      key={trip.id}
                      href={`/trip/${trip.id}/admin`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-sky-300 hover:shadow-md transition"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{trip.name}</h3>
                      {trip.destination && (
                        <p className="text-sm text-gray-600 mb-2">📍 {trip.destination}</p>
                      )}
                      {trip.startDate && trip.endDate && (
                        <p className="text-xs text-gray-500">
                          {format(new Date(trip.startDate), 'MMM d')} -{' '}
                          {format(new Date(trip.endDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <p className="mb-4">No trips planned yet for this TripCrew.</p>
                  <button
                    onClick={() => setShowCreateTripModal(true)}
                    className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
                  >
                    Create Your First Trip
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInviteModal && (
        <InviteMemberModal
          inviteUrl={inviteUrl}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showCreateTripModal && (
        <CreateTripModal
          onCreate={handleCreateTrip}
          onClose={() => setShowCreateTripModal(false)}
        />
      )}
    </div>
  )
}

