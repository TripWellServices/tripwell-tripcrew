/**
 * Plan Landing Page Client
 * 
 * Card-based landing page for planning a trip
 * Shows options: Start from City, Start from Event/Activity, Wishlist preview
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { LocalStorageAPI } from '@/lib/localStorage'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import PlanWizardClient from './PlanWizardClient'

interface WishlistItem {
  id: string
  title: string
  concert?: { name: string; cityId: string | null } | null
  hike?: { name: string; cityId: string | null } | null
  dining?: { name: string; cityId: string | null } | null
  attraction?: { name: string; cityId: string | null } | null
}

export default function PlanLandingClient() {
  const params = useParams()
  const tripCrewId = params.id as string
  const router = useRouter()
  
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [wizardMode, setWizardMode] = useState<'city' | 'event' | null>(null)
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const storedTravelerId = LocalStorageAPI.getTravelerId()
        if (storedTravelerId) {
          setTravelerId(storedTravelerId)
          loadWishlist(storedTravelerId)
        } else {
          try {
            const res = await fetch(`/api/auth/hydrate?firebaseId=${user.uid}`)
            const data = await res.json()
            const tid = data.traveler?.id ?? null
            setTravelerId(tid)
            if (tid) {
              LocalStorageAPI.setFullHydrationModel(data.traveler)
              loadWishlist(tid)
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

  async function loadWishlist(tid: string) {
    setWishlistLoading(true)
    try {
      const res = await fetch(`/api/wishlist?travelerId=${tid}`)
      const data = await res.json()
      setWishlistItems(data.items || [])
    } catch {
      setWishlistItems([])
    } finally {
      setWishlistLoading(false)
    }
  }

  function handleStartFromCity() {
    setWizardMode('city')
    setShowWizard(true)
  }

  function handleStartFromEvent() {
    setWizardMode('event')
    setShowWizard(true)
  }

  function handlePlanFromItem(item: WishlistItem) {
    setSelectedItem(item)
    setWizardMode('event')
    setShowWizard(true)
  }

  if (showWizard) {
    return (
      <PlanWizardClient
        tripCrewId={tripCrewId}
        initialTripId={null}
        initialItem={selectedItem || undefined}
      />
    )
  }

  const recentWishlist = wishlistItems.slice(0, 5)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Start a Trip</h1>
      <p className="text-gray-600 mb-8">
        Pick from your list first, or start from a city or event.
      </p>

      {/* Your list (wishlist) first — anchor-first */}
      {travelerId && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Your experiences</h2>
            {wishlistItems.length > 5 && (
              <Link
                href={`/tripcrews/${tripCrewId}/wishlist`}
                className="text-sm text-sky-600 hover:underline"
              >
                View all ({wishlistItems.length})
              </Link>
            )}
          </div>

          {wishlistLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : recentWishlist.length > 0 ? (
            <div className="space-y-3">
              {recentWishlist.map((item) => {
                const itemName =
                  item.concert?.name ||
                  item.hike?.name ||
                  item.dining?.name ||
                  item.attraction?.name ||
                  item.title
                const itemType = item.concert
                  ? 'concert'
                  : item.hike
                    ? 'hike'
                    : item.dining
                      ? 'dining'
                      : 'attraction'

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {itemType === 'concert' && '🎵'}
                        {itemType === 'hike' && '🥾'}
                        {itemType === 'dining' && '🍽️'}
                        {itemType === 'attraction' && '🏛️'}
                      </span>
                      <span className="font-medium text-gray-800">{itemName}</span>
                    </div>
                    <button
                      onClick={() => handlePlanFromItem(item)}
                      className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition"
                    >
                      Start a trip from this
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">No experiences yet. Add some first.</p>
              <Link
                href={`/tripcrews/${tripCrewId}/discover`}
                className="text-sm text-sky-600 hover:underline"
              >
                Experiences →
              </Link>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">Or start from a city or event if you don&apos;t have a list yet.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={handleStartFromCity}
          className="flex flex-col items-start gap-4 p-6 border-2 border-gray-200 rounded-xl hover:border-sky-400 hover:bg-sky-50 transition group text-left"
        >
          <div className="text-4xl">🗺️</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-sky-700 mb-1">
              Start from a City
            </h3>
            <p className="text-sm text-gray-600">
              Search destinations and get AI recommendations for your trip
            </p>
          </div>
        </button>

        <button
          onClick={handleStartFromEvent}
          className="flex flex-col items-start gap-4 p-6 border-2 border-gray-200 rounded-xl hover:border-sky-400 hover:bg-sky-50 transition group text-left"
        >
          <div className="text-4xl">🎭</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-sky-700 mb-1">
              Start from an Event
            </h3>
            <p className="text-sm text-gray-600">
              Plan around a concert, hike, restaurant, or attraction
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}
