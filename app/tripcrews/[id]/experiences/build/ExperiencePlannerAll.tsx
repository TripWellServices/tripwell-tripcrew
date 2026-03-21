/**
 * Build from saved — pick a category, then fetch traveller-scoped saved rows for that type only.
 * Selected row is passed as initialItem to ExperienceTripCreator (no second hydrate).
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { LocalStorageAPI } from '@/lib/localStorage'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import ExperienceTripCreator, {
  mapWishlistRowToExperienceAnchor,
  type ExperienceAnchorItem,
} from './ExperienceTripCreator'

type CategoryKey = 'hike' | 'concert' | 'dining' | 'attraction'

export interface ExperienceWishlistRow {
  id: string
  title: string
  concert?: {
    id: string
    name: string
    cityId?: string | null
    artist?: string | null
    venue?: string | null
  } | null
  hike?: {
    id: string
    name: string
    cityId?: string | null
    trailOrPlace?: string | null
    nearestTown?: string | null
  } | null
  dining?: {
    id: string
    title?: string | null
    cityId?: string | null
    category?: string | null
    address?: string | null
  } | null
  attraction?: {
    id: string
    title?: string | null
    cityId?: string | null
    category?: string | null
    address?: string | null
  } | null
}

function itemKind(item: ExperienceWishlistRow): CategoryKey {
  if (item.hike) return 'hike'
  if (item.concert) return 'concert'
  if (item.dining) return 'dining'
  return 'attraction'
}

function itemDisplayName(item: ExperienceWishlistRow): string {
  return (
    item.concert?.name ||
    item.hike?.name ||
    item.dining?.title ||
    item.attraction?.title ||
    item.title
  )
}

function itemSubtitle(item: ExperienceWishlistRow): string {
  if (item.hike)
    return [item.hike.trailOrPlace, item.hike.nearestTown].filter(Boolean).join(' · ') || ''
  if (item.concert)
    return [item.concert.artist, item.concert.venue].filter(Boolean).join(' · ') || ''
  if (item.dining)
    return [item.dining.category, item.dining.address].filter(Boolean).join(' · ') || ''
  if (item.attraction)
    return [item.attraction.category, item.attraction.address].filter(Boolean).join(' · ') || ''
  return ''
}

const CATEGORY_CARDS: {
  key: CategoryKey
  label: string
  icon: string
  blurb: string
}[] = [
  { key: 'hike', label: 'Hikes', icon: '🥾', blurb: 'Trails and outdoor routes you saved' },
  { key: 'concert', label: 'Concerts', icon: '🎵', blurb: 'Shows and live music' },
  { key: 'dining', label: 'Dining', icon: '🍽️', blurb: 'Restaurants and spots to eat' },
  { key: 'attraction', label: 'Attractions', icon: '🏛️', blurb: 'Things to see and do' },
]

export default function ExperiencePlannerAll() {
  const params = useParams()
  const tripCrewId = params.id as string

  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'categories' | 'items'>('categories')
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null)
  const [savedRows, setSavedRows] = useState<ExperienceWishlistRow[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [showCreator, setShowCreator] = useState(false)
  const [selectedInitialItem, setSelectedInitialItem] = useState<ExperienceAnchorItem | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setTravelerId(null)
        return
      }
      // Always resolve traveler from server so localStorage id matches DB (Build uses travelerId in API queries).
      try {
        const res = await fetch(`/api/auth/hydrate?firebaseId=${user.uid}`)
        const data = await res.json()
        const tid = data.traveler?.id ?? null
        setTravelerId(tid)
        if (tid && data.traveler) {
          LocalStorageAPI.setTravelerId(tid)
          LocalStorageAPI.setTraveler(data.traveler)
        }
      } catch {
        setTravelerId(LocalStorageAPI.getTravelerId())
      }
    })
    return () => unsubscribe()
  }, [])

  async function loadSavedForCategory(tid: string, category: CategoryKey) {
    setListLoading(true)
    setListError(null)
    try {
      let rows: ExperienceWishlistRow[] = []
      if (category === 'hike') {
        const res = await fetch(`/api/hikes?travelerId=${encodeURIComponent(tid)}`)
        const data = await res.json()
        if (!res.ok) {
          setListError(data.error || `API error ${res.status}`)
          setSavedRows([])
          return
        }
        const hikes = data.hikes || []
        rows = hikes.map((h: Record<string, unknown>) => ({
          id: String(h.id),
          title: String(h.name ?? ''),
          hike: {
            id: String(h.id),
            name: String(h.name ?? ''),
            cityId: (h.cityId as string | null | undefined) ?? null,
            trailOrPlace: (h.trailOrPlace as string | null | undefined) ?? null,
            nearestTown: (h.nearestTown as string | null | undefined) ?? null,
          },
        }))
      } else if (category === 'concert') {
        const res = await fetch(`/api/concerts?travelerId=${encodeURIComponent(tid)}`)
        const data = await res.json()
        if (!res.ok) {
          setListError(data.error || `API error ${res.status}`)
          setSavedRows([])
          return
        }
        const concerts = data.concerts || []
        rows = concerts.map((c: Record<string, unknown>) => ({
          id: String(c.id),
          title: String(c.name ?? ''),
          concert: {
            id: String(c.id),
            name: String(c.name ?? ''),
            cityId: (c.cityId as string | null | undefined) ?? null,
            artist: (c.artist as string | null | undefined) ?? null,
            venue: (c.venue as string | null | undefined) ?? null,
          },
        }))
      } else if (category === 'dining') {
        const res = await fetch(`/api/dining?travelerId=${encodeURIComponent(tid)}`)
        const data = await res.json()
        if (!res.ok) {
          setListError(data.error || `API error ${res.status}`)
          setSavedRows([])
          return
        }
        const dining = data.dining || []
        rows = dining.map((d: Record<string, unknown>) => ({
          id: String(d.id),
          title: String(d.title ?? ''),
          dining: {
            id: String(d.id),
            title: (d.title as string | null | undefined) ?? null,
            cityId: (d.cityId as string | null | undefined) ?? null,
            category: (d.category as string | null | undefined) ?? null,
            address: (d.address as string | null | undefined) ?? null,
          },
        }))
      } else {
        const res = await fetch(`/api/attractions?travelerId=${encodeURIComponent(tid)}`)
        const data = await res.json()
        if (!res.ok) {
          setListError(data.error || `API error ${res.status}`)
          setSavedRows([])
          return
        }
        const attractions = data.attractions || []
        rows = attractions.map((a: Record<string, unknown>) => ({
          id: String(a.id),
          title: String(a.title ?? ''),
          attraction: {
            id: String(a.id),
            title: (a.title as string | null | undefined) ?? null,
            cityId: (a.cityId as string | null | undefined) ?? null,
            category: (a.category as string | null | undefined) ?? null,
            address: (a.address as string | null | undefined) ?? null,
          },
        }))
      }
      setSavedRows(rows)
    } catch (e) {
      console.error('[saved experiences] fetch failed', e)
      setListError('Could not load saved experiences')
      setSavedRows([])
    } finally {
      setListLoading(false)
    }
  }

  function handlePickCategory(cat: CategoryKey) {
    if (!travelerId) return
    setActiveCategory(cat)
    setPhase('items')
    loadSavedForCategory(travelerId, cat)
  }

  function handleBackToCategories() {
    setPhase('categories')
    setActiveCategory(null)
    setSavedRows([])
    setListError(null)
  }

  function handlePlanFromRow(row: ExperienceWishlistRow) {
    setSelectedInitialItem(mapWishlistRowToExperienceAnchor(row as unknown as Record<string, unknown>))
    setShowCreator(true)
  }

  const categoryLabel = useMemo(() => {
    if (!activeCategory) return ''
    return CATEGORY_CARDS.find((c) => c.key === activeCategory)?.label ?? activeCategory
  }, [activeCategory])

  if (showCreator && selectedInitialItem) {
    return (
      <ExperienceTripCreator
        tripCrewId={tripCrewId}
        initialTripId={null}
        initialItem={selectedInitialItem}
        backHref={`/tripcrews/${tripCrewId}/experiences/build`}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Build from saved</h1>
          <p className="text-gray-600">
            Choose a category, then pick something you saved. Use{' '}
            <Link href={`/tripcrews/${tripCrewId}/wishlist`} className="text-sky-600 font-medium hover:underline">
              My Wishlist
            </Link>{' '}
            to see everything in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href={`/tripcrews/${tripCrewId}/experiences/find`}
            className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-800 text-sm font-medium hover:bg-gray-50"
          >
            Find experiences
          </Link>
          <Link
            href={`/tripcrews/${tripCrewId}/experiences/enter`}
            className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
          >
            Enter an experience
          </Link>
        </div>
      </div>

      {!travelerId && (
        <p className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
          Sign in to build from saved experiences.
        </p>
      )}

      {travelerId && phase === 'categories' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">What do you want to build around?</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {CATEGORY_CARDS.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => handlePickCategory(c.key)}
                  className="w-full text-left p-5 border border-gray-200 rounded-xl bg-white hover:border-sky-300 hover:shadow-sm transition flex gap-4"
                >
                  <span className="text-3xl shrink-0">{c.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{c.label}</p>
                    <p className="text-sm text-gray-500 mt-1">{c.blurb}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {travelerId && phase === 'items' && activeCategory && (
        <div>
          <button
            type="button"
            onClick={handleBackToCategories}
            className="text-sm text-sky-600 font-medium hover:underline mb-4"
          >
            ← Choose another category
          </button>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Saved {categoryLabel}</h2>
          <p className="text-sm text-gray-500 mb-4">Pick one to plan a trip around it.</p>

          {listError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 font-mono">
              {listError}
            </p>
          )}

          {listLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : savedRows.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedRows.map((item) => {
                const name = itemDisplayName(item)
                const sub = itemSubtitle(item)
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 p-4 border border-gray-200 rounded-xl bg-white hover:border-sky-300 hover:shadow-sm transition"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{name}</p>
                      {sub ? (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{sub}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePlanFromRow(item)}
                      className="w-full px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition"
                    >
                      Plan around this
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50">
              <p className="text-sm text-gray-600 mb-3">Nothing saved in this category yet.</p>
              <Link
                href={`/tripcrews/${tripCrewId}/experiences/find`}
                className="text-sm text-sky-600 font-medium hover:underline"
              >
                Find experiences →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
