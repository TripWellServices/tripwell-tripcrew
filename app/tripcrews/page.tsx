/**
 * Traveler Home (TripCrews)
 *
 * GoFast-style: primary = see my crew + explore trip options.
 * Create / Join are secondary actions, not the main fork.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getTravelerTripCrews, joinTripCrew } from '@/lib/actions/tripcrew'
import { LocalStorageAPI } from '@/lib/localStorage'
import Link from 'next/link'

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}
function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function IconPlusCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  )
}
function IconLink2({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )
}

export default function TripCrewsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [tripCrews, setTripCrews] = useState<any[]>([])
  const [error, setError] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [showLegacyCodeInput, setShowLegacyCodeInput] = useState(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/')
        return
      }

      const storedTravelerId = LocalStorageAPI.getTravelerId()
      const storedTripCrews = LocalStorageAPI.getTripCrewMemberships()

      if (storedTripCrews?.length > 0 && storedTravelerId) {
        setTravelerId(storedTravelerId)
        setTripCrews(storedTripCrews.map((m: any) => m.tripCrew))
        setLoading(false)
        loadTripCrews(storedTravelerId)
        return
      }

      if (storedTravelerId) {
        setTravelerId(storedTravelerId)
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
            const tid = data.traveler.id
            setTravelerId(tid)
            LocalStorageAPI.setFullHydrationModel(data.traveler)
            loadTripCrews(tid)
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
  }, [router])

  const loadTripCrews = async (id: string) => {
    try {
      const result = await getTravelerTripCrews(id)
      if (result.success) {
        const crews = result.tripCrews || []
        setTripCrews(crews)
        const traveler = LocalStorageAPI.getTraveler()
        if (traveler) {
          LocalStorageAPI.setTripCrewMemberships(crews.map((crew: any) => ({ tripCrew: crew })))
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

  // First crew ID for "Explore trip options" (plan wizard)
  const firstCrewId = tripCrews.length > 0 ? tripCrews[0].id : null

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
        {/* Header: Traveler Home */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Traveler Home</h1>
          <p className="text-white/90">See your crews and explore trip options</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Primary: Your Crews */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <IconUsers className="h-7 w-7" />
              My Crews
            </h2>
            <Link
              href="/tripcrews/new"
              className="text-sm font-medium text-white/90 hover:text-white underline"
            >
              Create a crew
            </Link>
          </div>

          {tripCrews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tripCrews.map((crew) => (
                <Link
                  key={crew.id}
                  href={`/tripcrews/${crew.id}`}
                  className="block bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition border border-white/20"
                >
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{crew.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{crew._count?.trips ?? 0} trips</span>
                    <span>{crew._count?.memberships ?? 0} members</span>
                  </div>
                  <p className="mt-3 text-sky-600 font-medium text-sm">View crew →</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white/95 rounded-xl shadow-lg p-8 text-center">
              <p className="text-gray-600 mb-4">You’re not in any crews yet.</p>
              <Link
                href="/tripcrews/new"
                className="inline-block px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
              >
                Create your first crew
              </Link>
            </div>
          )}
        </section>

        {/* Explore trip options */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-4">
            <IconMapPin className="h-7 w-7" />
            Explore trip options
          </h2>
          {firstCrewId ? (
            <Link
              href={`/tripcrews/${firstCrewId}/experiences/build`}
              className="block bg-white/95 rounded-xl shadow-lg p-6 hover:shadow-xl transition border border-white/20"
            >
              <p className="text-gray-800 font-medium">Plan a trip with your crew</p>
              <p className="text-gray-500 text-sm mt-1">Get destination ideas and build an itinerary</p>
              <p className="mt-3 text-sky-600 font-medium text-sm">Open experiences →</p>
            </Link>
          ) : (
            <div className="bg-white/95 rounded-xl shadow-lg p-6 border border-white/20">
              <p className="text-gray-600">Create or join a crew first to plan trips together.</p>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/tripcrews/new"
                  className="text-sky-600 font-medium hover:underline"
                >
                  Create a crew
                </Link>
                <span className="text-gray-400">·</span>
                <Link href="/join" className="text-sky-600 font-medium hover:underline">
                  I have an invite link
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Secondary: Create & Join (compact) */}
        <section className="flex flex-wrap items-center gap-4 text-sm">
          <Link
            href="/tripcrews/new"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white"
          >
            <IconPlusCircle className="h-4 w-4" />
            Create a crew
          </Link>
          <span className="text-white/50">·</span>
          <Link
            href="/join"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white"
          >
            <IconLink2 className="h-4 w-4" />
            Join with invite link
          </Link>
          {!showLegacyCodeInput ? (
            <>
              <span className="text-white/50">·</span>
              <button
                type="button"
                onClick={() => setShowLegacyCodeInput(true)}
                className="text-white/70 hover:text-white"
              >
                Have a code to paste?
              </button>
            </>
          ) : (
            <form onSubmit={handleJoin} className="inline-flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Invite code"
                className="w-32 px-2 py-1 rounded border border-white/30 bg-white/20 text-white placeholder-white/60 text-sm"
              />
              <button
                type="submit"
                disabled={joining || !travelerId || !joinCode.trim()}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-sm font-medium disabled:opacity-50"
              >
                {joining ? 'Joining...' : 'Join'}
              </button>
              <button
                type="button"
                onClick={() => setShowLegacyCodeInput(false)}
                className="text-white/70 hover:text-white text-sm"
              >
                Cancel
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
