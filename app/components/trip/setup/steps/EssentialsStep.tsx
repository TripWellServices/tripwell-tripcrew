'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ESSENTIAL_QUICK_SEARCHES,
  type EssentialCategory,
} from '@/lib/trip-essentials'

type EssentialItem = {
  id: string
  title: string
  category?: string | null
  address?: string | null
  distanceFromLodging?: number | null
  driveTimeMinutes?: number | null
}

type SearchResult = {
  place_id: string
  name: string
  formatted_address?: string
  rating?: number
}

type EssentialsStepProps = {
  tripId: string
  lodgingLat: number | null
  lodgingLng: number | null
  lodgingSet: boolean
  essentials: EssentialItem[]
  onEssentialsSaved?: () => void
}

export default function EssentialsStep({
  tripId,
  lodgingLat,
  lodgingLng,
  lodgingSet,
  essentials,
  onEssentialsSaved,
}: EssentialsStepProps) {
  const router = useRouter()
  const [customQuery, setCustomQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<EssentialCategory | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SearchResult[]>([])

  async function runSearch(query: string, category: EssentialCategory) {
    if (!lodgingSet || lodgingLat == null || lodgingLng == null) {
      setError('Set your hotel on the Stay step first — essentials search uses that location.')
      return
    }

    setLoading(true)
    setError(null)
    setActiveCategory(category)
    setResults([])

    try {
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `${query} near hotel`,
          locationBias: { lat: lodgingLat, lng: lodgingLng, radiusMeters: 8000 },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setResults(Array.isArray(data.results) ? data.results : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  async function savePlace(placeId: string, category: EssentialCategory) {
    setSavingId(placeId)
    setError(null)
    try {
      const res = await fetch('/api/hydrate/dining', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, tripId, categoryLabel: category }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save place')
      onEssentialsSaved?.()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save place')
    } finally {
      setSavingId(null)
    }
  }

  async function searchCustom() {
    const q = customQuery.trim()
    if (!q) return
    await runSearch(q, 'Convenience')
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Groceries / essentials</h3>
        <p className="text-sm text-gray-600">
          Practical stops near your stay — grocery, pharmacy, coffee, and convenience stores.
        </p>
      </div>

      {!lodgingSet ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Add your hotel on the Stay step first so we can search nearby essentials.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {ESSENTIAL_QUICK_SEARCHES.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={loading || !lodgingSet}
            onClick={() => void runSearch(item.query, item.category)}
            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              activeCategory === item.category
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:opacity-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={customQuery}
          onChange={(e) => setCustomQuery(e.target.value)}
          placeholder='Find "X" near my hotel'
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <button
          type="button"
          disabled={loading || !lodgingSet || !customQuery.trim()}
          onClick={() => void searchCustom()}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {loading ? <p className="text-sm text-gray-500">Searching nearby…</p> : null}

      {results.length > 0 ? (
        <ul className="space-y-2">
          {results.map((r) => {
            const alreadySaved = essentials.some((e) => e.title === r.name)
            return (
              <li
                key={r.place_id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{r.name}</p>
                  {r.formatted_address ? (
                    <p className="text-xs text-gray-500 mt-0.5">{r.formatted_address}</p>
                  ) : null}
                  {typeof r.rating === 'number' ? (
                    <p className="text-xs text-gray-500 mt-0.5">Rating {r.rating.toFixed(1)}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={alreadySaved || savingId === r.place_id || !activeCategory}
                  onClick={() =>
                    activeCategory ? void savePlace(r.place_id, activeCategory) : undefined
                  }
                  className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg border border-sky-200 text-sky-800 hover:bg-sky-50 disabled:opacity-50"
                >
                  {alreadySaved
                    ? 'Saved'
                    : savingId === r.place_id
                      ? 'Saving…'
                      : 'Save'}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {essentials.length > 0 ? (
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
          <p className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-2">
            Saved essentials
          </p>
          <ul className="space-y-2">
            {essentials.map((item) => (
              <li key={item.id} className="text-sm text-gray-800">
                <span className="font-medium">{item.title}</span>
                {item.category ? (
                  <span className="ml-2 text-xs text-green-800 bg-green-100 px-2 py-0.5 rounded-full">
                    {item.category}
                  </span>
                ) : null}
                {item.address ? (
                  <p className="text-xs text-gray-500 mt-0.5">{item.address}</p>
                ) : null}
                {item.driveTimeMinutes != null ? (
                  <p className="text-xs text-gray-500">
                    ~{item.driveTimeMinutes} min from hotel
                    {item.distanceFromLodging != null
                      ? ` (${item.distanceFromLodging.toFixed(1)} mi)`
                      : ''}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No essentials saved yet — run a quick search above when your hotel is set.
        </p>
      )}
    </div>
  )
}
