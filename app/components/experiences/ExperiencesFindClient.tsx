'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getFirebaseAuth } from '@/lib/firebase'
import { getHydrateTraveler } from '@/lib/hydrateTravelerClient'
import { onAuthStateChanged } from 'firebase/auth'
import { LocalStorageAPI } from '@/lib/localStorage'
import DiscoverFlow from '@/app/components/discover/DiscoverFlow'
import { experiencePaths } from '@/lib/experience-routes'

export default function ExperiencesFindClient() {
  const paths = experiencePaths()
  const [travelerId, setTravelerId] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const storedTravelerId = LocalStorageAPI.getTravelerId()
        if (storedTravelerId) {
          setTravelerId(storedTravelerId)
        } else {
          try {
            const res = await getHydrateTraveler(user)
            const data = await res.json()
            const tid = data.traveler?.id ?? null
            setTravelerId(tid)
            if (tid) LocalStorageAPI.setFullHydrationModel(data.traveler)
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
      <Link
        href={paths.hub}
        className="text-sm text-sky-600 hover:text-sky-800 font-medium mb-4 inline-block"
      >
        ← Back to Experiences
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Find experiences</h1>
      <p className="text-gray-500 text-sm mb-8">
        Pick a city, then explore concerts, hikes, dining, and attractions to save.
      </p>
      <DiscoverFlow travelerId={travelerId} />
    </div>
  )
}
