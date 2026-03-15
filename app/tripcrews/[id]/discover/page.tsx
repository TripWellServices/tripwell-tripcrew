'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import DiscoverFlow from '@/app/components/discover/DiscoverFlow'

export default function CrewDiscoverPage() {
  const params = useParams()
  const crewId = params.id as string

  const [travelerId, setTravelerId] = useState<string | null>(null)

  // Resolve Firebase auth → travelerId
  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const res = await fetch(`/api/auth/hydrate?firebaseId=${user.uid}`)
          const data = await res.json()
          setTravelerId(data.traveler?.id ?? null)
        } catch {
          setTravelerId(null)
        }
      } else {
        setTravelerId(null)
      }
    })
    return () => unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href={`/tripcrews/${crewId}`}
          className="inline-block text-sm text-sky-600 hover:underline font-medium mb-6"
        >
          &larr; Back to crew
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Discover</h1>
        <p className="text-gray-500 text-sm mb-8">
          Pick a city, choose a category, and explore what&apos;s out there. Save anything to your
          wishlist — no trip required.
        </p>

        {/* No tripId — city must be entered by user; no itinerary action */}
        <DiscoverFlow travelerId={travelerId} />
      </div>
    </div>
  )
}
