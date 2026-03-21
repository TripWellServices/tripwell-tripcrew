/**
 * Build from saved experiences — grid of ExperienceWishlist rows; opens trip creator by id.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LocalStorageAPI } from '@/lib/localStorage'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import ExperienceTripCreator from './ExperienceTripCreator'

type ExpFilter = 'all' | 'hike' | 'concert' | 'dining' | 'attraction'

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

function itemKind(item: ExperienceWishlistRow): ExpFilter {
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

export default function ExperiencePlannerAll() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tripCrewId = params.id as string

  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [savedRows, setSavedRows] = useState<ExperienceWishlistRow[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [showCreator, setShowCreator] = useState(false)
  const [cityOnlyMode, setCityOnlyMode] = useState(false)
  const [selectedExperienceWishlistId, setSelectedExperienceWishlistId] = useState<
    string | null
  >(null)
  const [filter, setFilter] = useState<ExpFilter>('all')

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const storedTravelerId = LocalStorageAPI.getTravelerId()
        if (storedTravelerId) {
          setTravelerId(storedTravelerId)
          loadSaved(storedTravelerId)
        } else {
          try {
            const res = await fetch(`/api/auth/hydrate?firebaseId=${user.uid}`)
            const data = await res.json()
            const tid = data.traveler?.id ?? null
            setTravelerId(tid)
            if (tid) {
              LocalStorageAPI.setFullHydrationModel(data.traveler)
              loadSaved(tid)
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

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'city') {
      setSelectedExperienceWishlistId(null)
      setCityOnlyMode(true)
      setShowCreator(true)
      router.replace(`/tripcrews/${tripCrewId}/experiences/build`, { scroll: false })
    }
  }, [searchParams, router, tripCrewId])

  async function loadSaved(tid: string) {
    setListLoading(true)
    try {
      const res = await fetch(`/api/wishlist?travelerId=${tid}`)
      const data = await res.json()
      setSavedRows(data.items || [])
    } catch {
      setSavedRows([])
    } finally {
      setListLoading(false)
    }
  }

  function handlePlanFromRow(row: ExperienceWishlistRow) {
    setSelectedExperienceWishlistId(row.id)
    setCityOnlyMode(false)
    setShowCreator(true)
  }

  const filteredItems = useMemo(() => {
    if (filter === 'all') return savedRows
    return savedRows.filter((it) => itemKind(it) === filter)
  }, [savedRows, filter])

  if (showCreator) {
    return (
      <ExperienceTripCreator
        tripCrewId={tripCrewId}
        initialTripId={null}
        experienceWishlistId={cityOnlyMode ? null : selectedExperienceWishlistId}
        forceCityFlow={cityOnlyMode}
      />
    )
  }

  const filters: { key: ExpFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'hike', label: 'Hikes' },
    { key: 'concert', label: 'Concerts' },
    { key: 'dining', label: 'Dining' },
    { key: 'attraction', label: 'Attractions' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Experiences</h1>
          <p className="text-gray-600">
            Build a trip from something you saved, find new ideas, or add your own.
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

      {travelerId && (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Saved — plan from here</h2>
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    filter === f.key
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {listLoading ? (
            <p className="text-sm text-gray-500">Loading your experiences…</p>
          ) : filteredItems.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredItems.map((item) => {
                const kind = itemKind(item)
                const name = itemDisplayName(item)
                const sub = itemSubtitle(item)
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 p-4 border border-gray-200 rounded-xl bg-white hover:border-sky-300 hover:shadow-sm transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-2xl shrink-0">
                        {kind === 'concert' && '🎵'}
                        {kind === 'hike' && '🥾'}
                        {kind === 'dining' && '🍽️'}
                        {kind === 'attraction' && '🏛️'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{name}</p>
                        {sub ? (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{sub}</p>
                        ) : null}
                      </div>
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
          ) : savedRows.length > 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-200 rounded-xl">
              Nothing in this category. Try another filter.
            </p>
          ) : (
            <div className="text-center py-10 border border-gray-200 rounded-xl bg-gray-50">
              <p className="text-sm text-gray-600 mb-3">No saved experiences yet.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link
                  href={`/tripcrews/${tripCrewId}/experiences/find`}
                  className="inline-flex text-sm text-sky-600 font-medium hover:underline"
                >
                  Find experiences →
                </Link>
                <span className="text-gray-300">·</span>
                <Link
                  href={`/tripcrews/${tripCrewId}/experiences/enter`}
                  className="inline-flex text-sm text-sky-600 font-medium hover:underline"
                >
                  Enter your own →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {!travelerId && (
        <p className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
          Sign in to see saved experiences and build a trip.
        </p>
      )}

      <div className="border-t border-gray-200 pt-6 mt-2">
        <p className="text-sm text-gray-500 mb-2">
          Don&apos;t have a saved experience to anchor yet?
        </p>
        <Link
          href={`/tripcrews/${tripCrewId}/experiences/build?mode=city`}
          className="text-sm text-sky-600 font-medium hover:underline"
        >
          Plan from a destination instead
        </Link>
      </div>
    </div>
  )
}
