/**
 * Wishlist Page
 * 
 * Shows all wishlist items for the traveler with "Plan from this" actions
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LocalStorageAPI } from '@/lib/localStorage'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import ExperienceTripCreator from '../experiences/build/ExperienceTripCreator'

interface ExperienceWishlistRow {
  id: string
  title: string
  notes?: string | null
  concert?: { id: string; name: string; cityId: string | null } | null
  hike?: {
    id: string
    name: string
    cityId: string | null
    trailOrPlace?: string | null
  } | null
  dining?: { id: string; title?: string | null; cityId: string | null } | null
  attraction?: { id: string; title?: string | null; cityId: string | null } | null
}

export default function WishlistPage() {
  const params = useParams()
  const tripCrewId = params.id as string
  const router = useRouter()
  
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [wishlistItems, setWishlistItems] = useState<ExperienceWishlistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [selectedExperienceWishlistId, setSelectedExperienceWishlistId] = useState<
    string | null
  >(null)

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
            setLoading(false)
          }
        }
      } else {
        setTravelerId(null)
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  async function loadWishlist(tid: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/wishlist?travelerId=${tid}`)
      const data = await res.json()
      setWishlistItems(data.items || [])
    } catch {
      setWishlistItems([])
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!travelerId) return
    if (!confirm('Remove this saved experience?')) return
    setDeletingId(id)
    try {
      const res = await fetch(
        `/api/wishlist?id=${encodeURIComponent(id)}&travelerId=${encodeURIComponent(travelerId)}`,
        { method: 'DELETE' }
      )
      if (res.ok && travelerId) {
        loadWishlist(travelerId)
      }
    } catch {
      // silent fail
    } finally {
      setDeletingId(null)
    }
  }

  function handlePlanFromItem(item: ExperienceWishlistRow) {
    setSelectedExperienceWishlistId(item.id)
    setShowWizard(true)
  }

  if (showWizard && selectedExperienceWishlistId) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          type="button"
          onClick={() => {
            setShowWizard(false)
            setSelectedExperienceWishlistId(null)
          }}
          className="text-sm text-sky-600 hover:underline font-medium mb-4"
        >
          ← Back to saved list
        </button>
        <ExperienceTripCreator
          tripCrewId={tripCrewId}
          initialTripId={null}
          experienceWishlistId={selectedExperienceWishlistId}
          backHref={`/tripcrews/${tripCrewId}/wishlist`}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Saved experiences</h1>
      <p className="text-gray-600 mb-8">
        Same list as Experiences — plan trips around what you saved.
      </p>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading…</p>
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-gray-600 mb-2">Nothing saved yet</p>
          <p className="text-sm text-gray-500 mb-4">
            Add experiences from the Experiences hub or Find flow.
          </p>
          <a
            href={`/tripcrews/${tripCrewId}/experiences`}
            className="inline-block px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition"
          >
            Go to Experiences →
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {wishlistItems.map((item) => {
            const itemName =
              item.concert?.name ||
              item.hike?.name ||
              item.dining?.title ||
              item.attraction?.title ||
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
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="text-2xl shrink-0">
                    {itemType === 'concert' && '🎵'}
                    {itemType === 'hike' && '🥾'}
                    {itemType === 'dining' && '🍽️'}
                    {itemType === 'attraction' && '🏛️'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-800 truncate">{itemName}</h3>
                    {item.notes && (
                      <p className="text-sm text-gray-500 mt-1 truncate">{item.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePlanFromItem(item)}
                    className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition"
                  >
                    Plan from this
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="px-3 py-2 text-gray-500 hover:text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === item.id ? '…' : '✕'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
