'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ThingsToDoCandidate } from '@/lib/trip-poi-suggestions'
import { LocalStorageAPI } from '@/lib/localStorage'

type SavedItem = {
  id: string
  title: string
  category?: string | null
  address?: string | null
  whyMustDo?: string | null
  bestCombinedWith?: string | null
  kind: 'mustDo' | 'dining' | 'experience'
}

type PoiStepProps = {
  tripId: string
  catalogueCityId: string | null
  tripCity?: string | null
  tripState?: string | null
  tripCountry?: string | null
  lodgingLat?: number | null
  lodgingLng?: number | null
  dining: Array<{
    id: string
    title: string
    category?: string | null
    address?: string | null
  }>
  attractions: Array<{
    id: string
    title: string
    category?: string | null
    address?: string | null
    whyMustDo?: string | null
    bestCombinedWith?: string | null
  }>
  adventures: Array<{
    id: string
    name: string
    category?: string | null
    notes?: string | null
  }>
  lodgingSet: boolean
}

const DEFAULT_FILTERS = {
  interests: '',
  mustDos: true,
  dining: true,
  experiences: true,
  outdoors: false,
  kidFriendly: false,
  nightlife: false,
}

function candidateKey(c: ThingsToDoCandidate): string {
  return `${c.bucket}:${c.title}`
}

function buildPlaceSearchQuery(candidate: ThingsToDoCandidate, cityLabel: string): string {
  if (candidate.placeQuery?.trim()) return candidate.placeQuery.trim()
  const parts = [candidate.title, cityLabel].filter(Boolean)
  return parts.join(' ')
}

export default function PoiStep({
  tripId,
  catalogueCityId,
  tripCity,
  tripState,
  tripCountry,
  lodgingLat,
  lodgingLng,
  dining,
  attractions,
  adventures,
  lodgingSet,
}: PoiStepProps) {
  const router = useRouter()
  const cityLabel = [tripCity, tripState, tripCountry].filter(Boolean).join(', ')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<{
    mustDos: ThingsToDoCandidate[]
    dining: ThingsToDoCandidate[]
    experiences: ThingsToDoCandidate[]
  } | null>(null)
  const [savedTitles, setSavedTitles] = useState<Set<string>>(() => {
    const titles = new Set<string>()
    for (const a of attractions) titles.add(`mustDos:${a.title}`)
    for (const d of dining) titles.add(`dining:${d.title}`)
    for (const e of adventures) titles.add(`experiences:${e.name}`)
    return titles
  })

  const savedItems: SavedItem[] = useMemo(
    () => [
      ...attractions.map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        address: a.address,
        whyMustDo: a.whyMustDo,
        bestCombinedWith: a.bestCombinedWith,
        kind: 'mustDo' as const,
      })),
      ...dining.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        address: d.address,
        kind: 'dining' as const,
      })),
      ...adventures.map((e) => ({
        id: e.id,
        title: e.name,
        category: e.category,
        address: e.notes,
        kind: 'experience' as const,
      })),
    ],
    [attractions, dining, adventures]
  )

  async function resolveGooglePlaceId(candidate: ThingsToDoCandidate): Promise<string | null> {
    const query = buildPlaceSearchQuery(candidate, cityLabel)
    if (!query.trim()) return null

    const body: Record<string, unknown> = { query }
    if (lodgingLat != null && lodgingLng != null) {
      body.locationBias = { lat: lodgingLat, lng: lodgingLng, radiusMeters: 25_000 }
    }

    const res = await fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !Array.isArray(data.results) || !data.results.length) return null
    return typeof data.results[0]?.place_id === 'string' ? data.results[0].place_id : null
  }

  async function saveMustDo(candidate: ThingsToDoCandidate) {
    const category = candidate.type ?? candidate.subtitle ?? 'Must do'
    const payload = {
      tripId,
      cityId: catalogueCityId,
      title: candidate.title,
      category,
      address: candidate.detail ?? null,
      website: candidate.url ?? null,
      description: candidate.detail ?? candidate.reason ?? null,
      whyMustDo: candidate.whyMustDo ?? candidate.reason ?? null,
      bestCombinedWith: candidate.bestCombinedWith ?? null,
    }

    const placeId = await resolveGooglePlaceId(candidate)
    if (placeId) {
      const hydrateRes = await fetch('/api/hydrate/attractions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          tripId,
          cityId: catalogueCityId,
          whyMustDo: payload.whyMustDo,
          bestCombinedWith: payload.bestCombinedWith,
        }),
      })
      if (hydrateRes.ok) return

      const hydrateData = await hydrateRes.json().catch(() => ({}))
      if (hydrateRes.status !== 500) {
        throw new Error(hydrateData.error || 'Failed to hydrate place')
      }
    }

    const res = await fetch('/api/attractions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to save')
    }
  }

  async function findSuggestions() {
    setError(null)
    const travelerId = LocalStorageAPI.getTravelerId()
    if (!travelerId) {
      setError('Sign in to find suggestions.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/trip/${tripId}/poi-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travelerId, filters }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load suggestions')
      setSuggestions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }

  async function saveCandidate(candidate: ThingsToDoCandidate) {
    const key = candidateKey(candidate)
    if (savedTitles.has(key)) return

    setSavingKey(key)
    setError(null)
    try {
      if (candidate.bucket === 'mustDos') {
        await saveMustDo(candidate)
      } else if (candidate.bucket === 'dining') {
        const res = await fetch('/api/dining', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId,
            cityId: catalogueCityId,
            title: candidate.title,
            category: candidate.subtitle ?? 'Dining',
            address: candidate.detail ?? null,
            website: candidate.url ?? null,
            description: candidate.reason ?? null,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to save')
        }
      } else {
        const res = await fetch('/api/adventures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId,
            cityId: catalogueCityId,
            name: candidate.title,
            category: candidate.subtitle ?? 'Experience',
            url: candidate.url ?? null,
            notes: [candidate.detail, candidate.reason].filter(Boolean).join(' · ') || null,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to save')
        }
      }

      setSavedTitles((prev) => new Set(prev).add(key))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingKey(null)
    }
  }

  function renderMustDoCard(item: ThingsToDoCandidate) {
    const key = candidateKey(item)
    const saved = savedTitles.has(key)
    return (
      <li
        key={key}
        className="border border-gray-200 rounded-lg p-4 bg-white flex flex-col"
      >
        <div className="flex items-start justify-between gap-2">
          <h5 className="font-semibold text-gray-900">{item.title}</h5>
          {item.type ? (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {item.type}
            </span>
          ) : null}
        </div>
        {item.subtitle && item.subtitle !== item.type ? (
          <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
        ) : null}
        {item.detail ? <p className="text-sm text-gray-600 mt-1">{item.detail}</p> : null}
        {item.whyMustDo ? (
          <p className="text-sm text-gray-800 mt-2">
            <span className="font-medium text-gray-900">Why must-do: </span>
            {item.whyMustDo}
          </p>
        ) : item.reason ? (
          <p className="text-sm text-gray-800 mt-2">
            <span className="font-medium text-gray-900">Why must-do: </span>
            {item.reason}
          </p>
        ) : null}
        {item.bestCombinedWith ? (
          <p className="text-xs text-gray-600 mt-2">
            <span className="font-medium">Best combined with: </span>
            {item.bestCombinedWith}
          </p>
        ) : null}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={saved || savingKey === key}
            onClick={() => void saveCandidate(item)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saved ? 'Saved' : savingKey === key ? 'Saving…' : 'Save to trip list'}
          </button>
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Link
            </a>
          ) : null}
        </div>
      </li>
    )
  }

  function renderBucket(
    title: string,
    items: ThingsToDoCandidate[] | undefined,
    accent: string,
    isMustDo = false
  ) {
    if (!items?.length) return null
    return (
      <div>
        <h4 className={`text-sm font-semibold ${accent} mb-2`}>{title}</h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) =>
            isMustDo ? (
              renderMustDoCard(item)
            ) : (
              (() => {
                const key = candidateKey(item)
                const saved = savedTitles.has(key)
                return (
                  <li
                    key={key}
                    className="border border-gray-200 rounded-lg p-4 bg-white flex flex-col"
                  >
                    <h5 className="font-semibold text-gray-900">{item.title}</h5>
                    {item.subtitle ? (
                      <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                    ) : null}
                    {item.detail ? (
                      <p className="text-sm text-gray-600 mt-1">{item.detail}</p>
                    ) : null}
                    {item.reason ? (
                      <p className="text-xs text-gray-500 mt-2 italic">{item.reason}</p>
                    ) : null}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={saved || savingKey === key}
                        onClick={() => void saveCandidate(item)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                      >
                        {saved ? 'Saved' : savingKey === key ? 'Saving…' : 'Save to trip list'}
                      </button>
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Link
                        </a>
                      ) : null}
                    </div>
                  </li>
                )
              })()
            )
          )}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Things to do</h3>
        <p className="text-sm text-gray-600">
          Angela suggests a top 5 blend for {cityLabel || 'your trip city'} — save picks to your trip
          list, then build your itinerary on the Plan tab.
        </p>
      </div>

      {!lodgingSet ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Set your stay first — we use lodging location to tune nearby suggestions and Google place
          matching.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Interests / vibe</span>
          <input
            type="text"
            value={filters.interests}
            onChange={(e) => setFilters((f) => ({ ...f, interests: e.target.value }))}
            placeholder="e.g. late-night food, old town, photo spots"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </label>

        <div className="flex flex-wrap gap-3 text-sm">
          {(
            [
              ['mustDos', 'Must dos'],
              ['dining', 'Dining'],
              ['experiences', 'Experiences'],
              ['outdoors', 'Outdoors'],
              ['kidFriendly', 'Kid-friendly'],
              ['nightlife', 'Nightlife'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters[key]}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, [key]: e.target.checked }))
                }
                className="rounded border-gray-300"
              />
              {label}
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void findSuggestions()}
          disabled={loading}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? 'Finding…' : 'Find top 5 must-dos for this trip'}
        </button>
      </div>

      {suggestions ? (
        <div className="space-y-6">
          {renderBucket('Top 5 Must Dos', suggestions.mustDos, 'text-blue-800', true)}
          {renderBucket('Dining', suggestions.dining, 'text-emerald-800')}
          {renderBucket('Experiences', suggestions.experiences, 'text-purple-800')}
        </div>
      ) : null}

      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Your trip list</h4>
          <Link
            href={`/trip/${tripId}/plan`}
            className="text-sm text-sky-700 font-medium hover:underline"
          >
            Build itinerary →
          </Link>
        </div>

        {savedItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600 text-sm">
              Nothing saved yet — find top things above and save them to your trip list.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedItems.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {item.kind === 'mustDo'
                    ? 'Must do'
                    : item.kind === 'dining'
                      ? 'Dining'
                      : 'Experience'}
                </span>
                <h5 className="font-semibold text-gray-900 mt-0.5">{item.title}</h5>
                {item.category ? (
                  <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>
                ) : null}
                {item.whyMustDo ? (
                  <p className="text-xs text-gray-700 mt-1 line-clamp-2">{item.whyMustDo}</p>
                ) : null}
                {item.bestCombinedWith ? (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    Pair with: {item.bestCombinedWith}
                  </p>
                ) : null}
                {item.address ? (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.address}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
