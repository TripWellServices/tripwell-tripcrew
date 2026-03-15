'use client'

import { useState, useEffect } from 'react'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { LocalStorageAPI } from '@/lib/localStorage'
import DiscoverFlow from '@/app/components/discover/DiscoverFlow'

export default function CrewDiscoverPage() {
  const [travelerId, setTravelerId] = useState<string | null>(null)

  // Resolve Firebase auth → travelerId
  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const storedTravelerId = LocalStorageAPI.getTravelerId()
        if (storedTravelerId) {
          setTravelerId(storedTravelerId)
        } else {
          try {
            const res = await fetch(`/api/auth/hydrate?firebaseId=${user.uid}`)
            const data = await res.json()
            const tid = data.traveler?.id ?? null
            setTravelerId(tid)
            if (tid) {
              LocalStorageAPI.setFullHydrationModel(data.traveler)
            }
          } catch {
            setTravelerId(null)
          }
        }
      } else {
        setTravelerId(null)
      }
    })
    return () => unsubscribe()
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Discover</h1>
      <p className="text-gray-500 text-sm mb-8">
        Pick a city, choose a category, and explore what&apos;s out there. Save anything to your
        wishlist — no trip required.
      </p>

      {/* No tripId — city must be entered by user; no itinerary action */}
      <DiscoverFlow travelerId={travelerId} />
    </div>
  )
}
