/**
 * Build from saved experiences — grid of ExperienceWishlist rows; opens trip creator by id.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { LocalStorageAPI } from '@/lib/localStorage'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import ExperienceTripCreator, { type ExperienceAnchorItem } from './ExperienceTripCreator'

type ExpFilter = 'all' | 'hike' | 'concert' | 'dining' | 'attraction'

export interface ExperienceWishlistRow {
  id: string
  title: string
  /** True when row comes from hikes you authored (not a wishlist bookmark). */
  fromAuthor?: boolean
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
  const tripCrewId = params.id as string

  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [savedRows, setSavedRows] = useState<ExperienceWishlistRow[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [showCreator, setShowCreator] = useState(false)
  const [selectedExperienceWishlistId, setSelectedExperienceWishlistId] = useState<
    string | null
  >(null)
  const [selectedInitialItem, setSelectedInitialItem] = useState<ExperienceAnchorItem | null>(
    null
  )
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

  async function loadSaved(tid: string) {
    setListLoading(true)
    setListError(null)
    try {
      const [wlRes, hikeRes] = await Promise.all([
        fetch(`/api/wishlist?travelerId=${tid}`),
        fetch(`/api/hikes?createdById=${encodeURIComponent(tid)}`),
      ])
      const wlData = await wlRes.json().catch(() => ({}))
      const hikeData = await hikeRes.json().catch(() => ({}))

      const errs: string[] = []
      if (!wlRes.ok) {
        console.error('[wishlist] API error', wlRes.status, wlData)
        errs.push(String(wlData.error || `wishlist ${wlRes.status}`))
      }
      if (!hikeRes.ok) {
        console.error('[hikes] API error', hikeRes.status, hikeData)
        errs.push(String(hikeData.error || `hikes ${hikeRes.status}`))
      }

      const wishItems: ExperienceWishlistRow[] = wlRes.ok ? wlData.items || [] : []
      const hikesRaw = hikeRes.ok ? hikeData.hikes || [] : []

      const wishHikeIds = new Set(
        wishItems.map((w) => w.hike?.id).filter(Boolean) as string[]
      )

      const authoredRows: ExperienceWishlistRow[] = hikesRaw
        .filter((h: { id: string }) => !wishHikeIds.has(h.id))
        .map(
          (h: {
            id: string
            name: string
            cityId: string | null
            trailOrPlace: string | null
            nearestTown: string | null
          }) => ({
            id: `hike:${h.id}`,
            title: h.name,
            fromAuthor: true,
            hike: {
              id: h.id,
              name: h.name,
              cityId: h.cityId,
              trailOrPlace: h.trailOrPlace,
              nearestTown: h.nearestTown,
            },
          })
        )

      setSavedRows([...wishItems, ...authoredRows])
      if (errs.length) setListError(errs.join(' · '))
    } catch (e) {
      console.error('[saved experiences] fetch failed', e)
      setListError('Could not load saved experiences')
      setSavedRows([])
    } finally {
      setListLoading(false)
    }
  }

  function handlePlanFromRow(row: ExperienceWishlistRow) {
    if (row.fromAuthor && row.hike) {
      setSelectedExperienceWishlistId(null)
      setSelectedInitialItem({
        id: row.hike.id,
        title: row.title,
        hike: {
          id: row.hike.id,
          name: row.hike.name,
          cityId: row.hike.cityId ?? null,
          trailOrPlace: row.hike.trailOrPlace ?? null,
        },
      })
    } else {
      setSelectedInitialItem(null)
      setSelectedExperienceWishlistId(row.id)
    }
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
        experienceWishlistId={selectedExperienceWishlistId}
        initialItem={selectedInitialItem ?? undefined}
        backHref={`/tripcrews/${tripCrewId}/experiences/build`}
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

          {listError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 font-mono">
              {listError}
            </p>
          )}

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
            <Link
              href={`/tripcrews/${tripCrewId}/experiences/enter`}
              className="flex flex-col items-center justify-center gap-2 py-14 border-2 border-dashed border-gray-200 rounded-2xl hover:border-sky-400 hover:bg-sky-50 transition group"
            >
              <span className="w-14 h-14 rounded-full border-2 border-gray-300 group-hover:border-sky-400 flex items-center justify-center transition">
                <span className="text-2xl font-light text-gray-400 group-hover:text-sky-500 leading-none select-none">
                  +
                </span>
              </span>
              <span className="text-sm text-gray-500 group-hover:text-sky-600 transition">
                Add an experience
              </span>
            </Link>
          )}
        </div>
      )}

      {!travelerId && (
        <p className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
          Sign in to see saved experiences and build a trip.
        </p>
      )}
    </div>
  )
}
