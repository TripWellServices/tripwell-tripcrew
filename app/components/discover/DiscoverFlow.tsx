'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

export type DiscoverType = 'concert' | 'hike' | 'dining' | 'attraction'

interface CatalogueItem {
  id: string
  // Concert fields
  name?: string
  artist?: string
  venue?: string
  eventDate?: string
  // Hike fields
  trailOrPlace?: string
  difficulty?: string
  distanceMi?: number
  durationMin?: number
  routeType?: string | null
  // Dining / Attraction fields
  title?: string
  category?: string
  address?: string
  // Shared
  url?: string
  imageUrl?: string
  notes?: string
}

interface Suggestion {
  name: string
  subtitle?: string
  detail?: string
  url?: string
  notes?: string
  /** Echoed from discover API for hikes; sent back on catalogue save */
  difficulty?: string
  distanceMi?: number
  durationMin?: number
}

interface PlanSummary {
  id: string
  name: string
  season?: string | null
  _count?: { trips: number; savedExperiences?: number }
}

interface DiscoverFlowProps {
  /** Pre-set city (in-trip mode). If omitted, user types city in React state. */
  defaultCity?: string
  defaultState?: string
  /** Present when this flow is inside a trip — enables Add to Itinerary action. */
  tripId?: string
  /** Firebase / Traveler ID for wishlist actions and Build a trip. */
  travelerId?: string | null
  /** Traveler home city/state for tripScope pre-fill (local vs travel). */
  hometownCity?: string | null
  homeState?: string | null
  /** When set, "Add a hike with AI" uses crew layout (sidebar) at /tripcrews/:id/hikes/new */
  tripCrewId?: string | null
}

// ─── Category cards config ────────────────────────────────────────────────────

const CATEGORIES: { type: DiscoverType; label: string; icon: string; description: string }[] = [
  { type: 'concert', label: 'Concerts',   icon: '🎵', description: 'Live music & events' },
  { type: 'hike',    label: 'Hikes',      icon: '🥾', description: 'Trails & outdoor routes' },
  { type: 'dining',  label: 'Dining',     icon: '🍽️', description: 'Restaurants & eats' },
  { type: 'attraction', label: 'Attractions', icon: '🏛️', description: 'Things to see & do' },
]

// ─── Helper: display name for a catalogue item ────────────────────────────────

function itemDisplayName(item: CatalogueItem): string {
  return item.name ?? item.title ?? 'Untitled'
}

function itemSubtitle(item: CatalogueItem, type: DiscoverType): string {
  if (type === 'concert') return [item.artist, item.venue].filter(Boolean).join(' @ ')
  if (type === 'hike') {
    const bits = [
      item.trailOrPlace,
      item.difficulty,
      item.distanceMi != null ? `${item.distanceMi} mi` : null,
      item.durationMin != null ? `${item.durationMin} min` : null,
      item.routeType?.replace(/_/g, ' '),
    ].filter(Boolean)
    return bits.join(' · ')
  }
  if (type === 'dining')  return [item.category, item.address].filter(Boolean).join(' · ')
  return [item.category, item.address].filter(Boolean).join(' · ')
}

// ─── DiscoverFlow ─────────────────────────────────────────────────────────────

export default function DiscoverFlow({
  defaultCity,
  defaultState,
  tripId,
  travelerId,
  hometownCity,
  homeState,
  tripCrewId,
}: DiscoverFlowProps) {
  // City state (standalone mode only; in-trip mode is pre-set)
  const [cityInput, setCityInput] = useState(defaultCity ?? '')
  const [stateInput, setStateInput] = useState(defaultState ?? '')
  const [committedCity, setCommittedCity] = useState(defaultCity ?? '')
  const [committedState, setCommittedState] = useState(defaultState ?? '')

  const [activeType, setActiveType] = useState<DiscoverType | null>(null)

  // Catalogue results (from DB)
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([])
  const [catalogueLoading, setCatalogueLoading] = useState(false)
  const [catalogueCity, setCatalogueCity] = useState<{ id: string; name: string; state?: string | null } | null>(null)

  // AI suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverShown, setDiscoverShown] = useState(false)

  /** After AI suggests an item: rowKey → catalogue id (wishlist is a separate step). */
  const [suggestionSavedIds, setSuggestionSavedIds] = useState<
    Record<string, string>
  >({})

  // Action feedback
  const [savingId, setSavingId] = useState<string | null>(null)
  const [wishlistingId, setWishlistingId] = useState<string | null>(null)
  const [itineraryingId, setItineraryingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ id: string; message: string; ok: boolean } | null>(null)

  // Build a trip (anchor fork)
  const [buildTripItem, setBuildTripItem] = useState<{ item: CatalogueItem; type: DiscoverType } | null>(null)
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [buildTripPlanId, setBuildTripPlanId] = useState<string>('')
  const [buildTripNewPlanName, setBuildTripNewPlanName] = useState('')
  const [buildTripScope, setBuildTripScope] = useState<'local' | 'travel'>('travel')
  const [buildTripSubmitting, setBuildTripSubmitting] = useState(false)
  const [buildTripCreatedTripId, setBuildTripCreatedTripId] = useState<string | null>(null)

  const inTripMode = Boolean(defaultCity)
  const effectiveCity = inTripMode ? defaultCity! : committedCity
  const effectiveState = inTripMode ? defaultState ?? '' : committedState

  const router = useRouter()

  function showFeedback(id: string, message: string, ok: boolean) {
    setFeedback({ id, message, ok })
    setTimeout(() => setFeedback(null), 3000)
  }

  // ── Build a trip: when modal opens, fetch plans and pre-fill tripScope ───────
  useEffect(() => {
    if (!buildTripItem || !travelerId) return
    setPlansLoading(true)
    fetch(`/api/plan?travelerId=${travelerId}`)
      .then((r) => r.json())
      .then((data) => {
        setPlans(data.plans ?? [])
        const first = data.plans?.[0]
        if (first) setBuildTripPlanId(first.id)
        else setBuildTripPlanId('')
      })
      .finally(() => setPlansLoading(false))
    const itemCity = effectiveCity?.toLowerCase() ?? ''
    const home = [hometownCity, homeState].filter(Boolean).join(', ').toLowerCase()
    const isLocal = home && itemCity && (itemCity.includes(home) || home.includes(itemCity))
    setBuildTripScope(isLocal ? 'local' : 'travel')
  }, [buildTripItem, travelerId, effectiveCity, hometownCity, homeState])

  async function submitBuildTrip() {
    if (!buildTripItem || !travelerId || !activeType) return
    setBuildTripSubmitting(true)
    try {
      let planId = buildTripPlanId
      if (buildTripNewPlanName.trim()) {
        const createRes = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            travelerId,
            name: buildTripNewPlanName.trim(),
          }),
        })
        const createData = await createRes.json()
        if (!createRes.ok) throw new Error(createData.error)
        planId = createData.plan.id
      }
      if (!planId) throw new Error('Pick or create a plan')
      const body: Record<string, string> = {
        tripScope: buildTripScope,
      }
      if (activeType === 'concert') body.concertId = buildTripItem.item.id
      else if (activeType === 'hike') body.hikeId = buildTripItem.item.id
      else if (activeType === 'dining') body.diningId = buildTripItem.item.id
      else if (activeType === 'attraction') body.attractionId = buildTripItem.item.id
      const res = await fetch(`/api/plan/${planId}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBuildTripCreatedTripId(data.trip?.id)
      setBuildTripItem(null)
      if (data.trip?.id) router.push(`/trip/${data.trip.id}/admin`)
    } catch (e) {
      showFeedback(buildTripItem.item.id, (e as Error).message || 'Failed to create trip', false)
    } finally {
      setBuildTripSubmitting(false)
    }
  }

  // ── Load catalogue for city + type ──────────────────────────────────────────

  async function refreshCatalogueItemsOnly(
    type: DiscoverType,
    city: string,
    state: string
  ) {
    try {
      const params = new URLSearchParams({ city, type })
      if (state) params.set('state', state)
      const res = await fetch(`/api/catalogue?${params}`)
      const data = await res.json()
      setCatalogueItems(data.items ?? [])
      setCatalogueCity(data.city ?? null)
    } catch {
      // silent — catalogue may be empty
    }
  }

  async function loadCatalogue(type: DiscoverType, city: string, state: string) {
    setCatalogueLoading(true)
    setCatalogueItems([])
    setSuggestions([])
    setDiscoverShown(false)
    setSuggestionSavedIds({})
    setCatalogueCity(null)

    try {
      await refreshCatalogueItemsOnly(type, city, state)
    } catch {
      // silent — catalogue may be empty
    } finally {
      setCatalogueLoading(false)
    }
  }

  // ── Pick a category card ─────────────────────────────────────────────────────

  function pickCategory(type: DiscoverType) {
    const city = inTripMode ? defaultCity! : committedCity
    const state = inTripMode ? defaultState ?? '' : committedState
    if (!city.trim()) return

    setActiveType(type)
    loadCatalogue(type, city, state)
  }

  // ── Discover more (AI stub) ──────────────────────────────────────────────────

  async function discoverMore() {
    if (!activeType || !effectiveCity) return
    setDiscoverLoading(true)

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: effectiveCity, state: effectiveState, type: activeType }),
      })
      const data = await res.json()
      setSuggestionSavedIds({})
      setSuggestions(data.suggestions ?? [])
      setDiscoverShown(true)
    } catch {
      setSuggestions([])
    } finally {
      setDiscoverLoading(false)
    }
  }

  // ── Save suggestion to city catalogue (creates first-class record) ───────────

  async function saveToCatalogue(
    suggestion: Suggestion,
    savingKey?: string
  ): Promise<string | null> {
    const key = savingKey ?? suggestion.name
    setSavingId(key)

    try {
      const res = await fetch('/api/discover', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: effectiveCity,
          state: effectiveState,
          country: 'USA',
          type: activeType,
          suggestion,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const savedId: string = data.saved?.id
      await refreshCatalogueItemsOnly(activeType!, effectiveCity, effectiveState)
      showFeedback(key, 'Added to catalogue', true)
      return savedId
    } catch {
      showFeedback(key, 'Failed to save to catalogue', false)
      return null
    } finally {
      setSavingId(null)
    }
  }

  // ── Wishlist an item already in the catalogue ────────────────────────────────

  async function addToWishlist(
    item: CatalogueItem,
    type: DiscoverType,
    feedbackId?: string
  ) {
    const fid = feedbackId ?? item.id
    if (!travelerId) {
      showFeedback(fid, 'Sign in to add to Experiences', false)
      return
    }

    setWishlistingId(item.id)
    try {
      const body: Record<string, string> = {
        travelerId,
        title: itemDisplayName(item),
      }
      if (type === 'concert')    body.concertId    = item.id
      if (type === 'hike')       body.hikeId       = item.id
      if (type === 'dining')     body.diningId     = item.id
      if (type === 'attraction') body.attractionId = item.id

      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      showFeedback(fid, 'Added to Experiences', true)
    } catch {
      showFeedback(fid, 'Could not add to Experiences', false)
    } finally {
      setWishlistingId(null)
    }
  }

  // ── Add catalogue item to trip itinerary ─────────────────────────────────────

  async function addToItinerary(item: CatalogueItem, type: DiscoverType) {
    if (!tripId) return

    setItineraryingId(item.id)
    try {
      const body: Record<string, string> = {
        title: itemDisplayName(item),
        type,
      }
      if (type === 'concert')    body.concertId    = item.id
      if (type === 'hike')       body.hikeId       = item.id
      if (type === 'dining')     body.diningId     = item.id
      if (type === 'attraction') body.attractionId = item.id

      const res = await fetch(`/api/trip/${tripId}/itinerary-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      showFeedback(item.id, 'Added to itinerary', true)
    } catch {
      showFeedback(item.id, 'Failed to add to itinerary', false)
    } finally {
      setItineraryingId(null)
    }
  }

  // ── AI suggestions: catalogue first, then explicit Experiences (wishlist) ─────

  async function saveSuggestionToCatalogOnly(
    suggestion: Suggestion,
    rowKey: string
  ) {
    const id = await saveToCatalogue(suggestion, rowKey)
    if (id) setSuggestionSavedIds((prev) => ({ ...prev, [rowKey]: id }))
  }

  async function wishlistSuggestionFromRow(rowKey: string, suggestion: Suggestion) {
    const id = suggestionSavedIds[rowKey]
    if (!id) return
    await addToWishlist({ id, name: suggestion.name }, activeType!, rowKey)
  }

  async function saveAndAddToItinerary(suggestion: Suggestion, rowKey: string) {
    const id = await saveToCatalogue(suggestion, rowKey)
    if (id) setSuggestionSavedIds((prev) => ({ ...prev, [rowKey]: id }))
    if (!id || !tripId) return
    await addToItinerary({ id, name: suggestion.name }, activeType!)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── City input (standalone mode only) ── */}
      {!inTripMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Where do you want to go?
          </h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">City</label>
              <input
                type="text"
                placeholder="Nashville, New York, Denver…"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCommittedCity(cityInput.trim())
                    setCommittedState(stateInput.trim())
                    setActiveType(null)
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs text-gray-500 mb-1">State</label>
              <input
                type="text"
                placeholder="TN"
                value={stateInput}
                onChange={(e) => setStateInput(e.target.value)}
                maxLength={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <button
              onClick={() => {
                setCommittedCity(cityInput.trim())
                setCommittedState(stateInput.trim())
                setActiveType(null)
              }}
              disabled={!cityInput.trim()}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Go
            </button>
          </div>
        </div>
      )}

      {/* ── City header (in-trip mode) ── */}
      {inTripMode && (
        <div className="text-sm text-gray-500">
          Discovering in{' '}
          <span className="font-semibold text-gray-800">
            {defaultCity}{defaultState ? `, ${defaultState}` : ''}
          </span>
        </div>
      )}

      {(inTripMode || committedCity) && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
          <span className="font-medium">Add a hike</span>{' '}
          Discover ideas from a short form, or paste an AllTrails-style blurb to save to the
          catalogue —{' '}
          <Link
            href={(() => {
              const qs = new URLSearchParams({
                ...(effectiveCity ? { city: effectiveCity } : {}),
                ...(effectiveState ? { state: effectiveState } : {}),
              })
              const findReturn = tripCrewId
                ? `/tripcrews/${tripCrewId}/experiences/find`
                : '/traveler/experiences/find'
              if (tripId) {
                qs.set('return', `/trip/${tripId}/discover`)
              } else {
                qs.set('return', findReturn)
              }
              const base = tripCrewId
                ? `/tripcrews/${tripCrewId}/hikes/new`
                : '/hikes/new'
              const q = qs.toString()
              return `${base}${q ? `?${q}` : ''}`
            })()}
            className="text-emerald-800 underline font-semibold hover:text-emerald-950"
          >
            Add a hike with AI
          </Link>
          .
        </div>
      )}

      {/* ── Category cards ── */}
      {(inTripMode || committedCity) && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            What kind of thing?
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.type}
                onClick={() => pickCategory(cat.type)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                  activeType === cat.type
                    ? 'border-sky-500 bg-sky-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-sky-300 hover:bg-sky-50'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-sm font-semibold text-gray-800">{cat.label}</span>
                <span className="text-xs text-gray-500">{cat.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Catalogue results ── */}
      {activeType && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              In the catalogue
            </h2>
            {!discoverShown && (
              <button
                onClick={discoverMore}
                disabled={discoverLoading}
                className="text-sm text-sky-600 hover:text-sky-800 font-medium disabled:opacity-50"
              >
                {discoverLoading ? 'Finding more…' : '+ Discover more'}
              </button>
            )}
          </div>

          {catalogueLoading ? (
            <p className="text-sm text-gray-400 animate-pulse">Loading catalogue…</p>
          ) : catalogueItems.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-500">
                Nothing in the catalogue for {effectiveCity} yet.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Hit &ldquo;Discover more&rdquo; to find options and add them.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {catalogueItems.map((item) => (
                <CatalogueItemRow
                  key={item.id}
                  item={item}
                  type={activeType}
                  tripId={tripId}
                  travelerId={travelerId}
                  feedback={feedback?.id === item.id ? feedback : null}
                  isWishlisting={wishlistingId === item.id}
                  isItinerarying={itineraryingId === item.id}
                  onWishlist={() => addToWishlist(item, activeType)}
                  onItinerary={() => addToItinerary(item, activeType)}
                  onBuildTrip={travelerId ? () => setBuildTripItem({ item, type: activeType }) : undefined}
                />
              ))}
            </ul>
          )}

          {/* ── AI suggestions ── */}
          {discoverShown && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Suggested by AI
              </h2>
              <p className="text-xs text-gray-500">
                Add to the city catalogue first, then add to your Experiences list if you want
                it bookmarked (same as browsing the list above).
              </p>
              {suggestions.length === 0 ? (
                <p className="text-sm text-gray-400">No suggestions found.</p>
              ) : (
                <ul className="space-y-2">
                  {suggestions.map((s, i) => {
                    const rowKey = `ai-${i}-${s.name}`
                    const isSaving = savingId === rowKey
                    const savedId = suggestionSavedIds[rowKey]
                    const canWishlist = Boolean(travelerId && savedId)
                    return (
                      <li
                        key={rowKey}
                        className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                          {s.subtitle && (
                            <p className="text-xs text-gray-500 truncate">{s.subtitle}</p>
                          )}
                          {s.detail && (
                            <p className="text-xs text-gray-400 truncate">{s.detail}</p>
                          )}
                          {feedback?.id === rowKey && (
                            <p
                              className={`text-xs mt-1 font-medium ${
                                feedback.ok ? 'text-green-600' : 'text-red-500'
                              }`}
                            >
                              {feedback.message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => saveSuggestionToCatalogOnly(s, rowKey)}
                            disabled={isSaving}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                          >
                            {isSaving ? 'Saving…' : 'Add to catalogue'}
                          </button>
                          <button
                            type="button"
                            onClick={() => wishlistSuggestionFromRow(rowKey, s)}
                            disabled={
                              !canWishlist || wishlistingId === savedId || isSaving
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-medium hover:bg-emerald-200 disabled:opacity-50"
                          >
                            {wishlistingId === savedId
                              ? 'Adding…'
                              : 'Add to Experiences'}
                          </button>
                          {tripId && (
                            <button
                              type="button"
                              onClick={() => saveAndAddToItinerary(s, rowKey)}
                              disabled={isSaving}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 disabled:opacity-50"
                            >
                              {isSaving ? 'Saving…' : '+ Itinerary'}
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Build a trip modal (anchor fork) ── */}
      {buildTripItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !buildTripSubmitting && setBuildTripItem(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Build a trip around this</h3>
            <p className="text-sm text-gray-600">{itemDisplayName(buildTripItem.item)}</p>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Plan</label>
              {plansLoading ? (
                <p className="text-sm text-gray-400">Loading plans…</p>
              ) : (
                <>
                  <select
                    value={buildTripNewPlanName ? '' : buildTripPlanId}
                    onChange={(e) => {
                      setBuildTripPlanId(e.target.value)
                      setBuildTripNewPlanName('')
                    }}
                    disabled={!!buildTripNewPlanName.trim()}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="">New plan…</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p._count ? `(${p._count.trips} trips)` : ''}
                      </option>
                    ))}
                  </select>
                  {(!buildTripPlanId || buildTripNewPlanName) && (
                    <input
                      type="text"
                      placeholder="New plan name"
                      value={buildTripNewPlanName}
                      onChange={(e) => {
                        setBuildTripNewPlanName(e.target.value)
                        if (e.target.value.trim()) setBuildTripPlanId('')
                      }}
                      className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Scope</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tripScope"
                    checked={buildTripScope === 'local'}
                    onChange={() => setBuildTripScope('local')}
                  />
                  <span className="text-sm">Local</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tripScope"
                    checked={buildTripScope === 'travel'}
                    onChange={() => setBuildTripScope('travel')}
                  />
                  <span className="text-sm">Travel</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBuildTripItem(null)}
                disabled={buildTripSubmitting}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitBuildTrip}
                disabled={buildTripSubmitting || (!buildTripPlanId && !buildTripNewPlanName.trim())}
                className="flex-1 px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
              >
                {buildTripSubmitting ? 'Creating…' : 'Create trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CatalogueItemRow ─────────────────────────────────────────────────────────

function CatalogueItemRow({
  item,
  type,
  tripId,
  travelerId,
  feedback,
  isWishlisting,
  isItinerarying,
  onWishlist,
  onItinerary,
  onBuildTrip,
}: {
  item: CatalogueItem
  type: DiscoverType
  tripId?: string
  travelerId?: string | null
  feedback: { message: string; ok: boolean } | null
  isWishlisting: boolean
  isItinerarying: boolean
  onWishlist: () => void
  onItinerary: () => void
  onBuildTrip?: () => void
}) {
  return (
    <li className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{itemDisplayName(item)}</p>
        <p className="text-xs text-gray-500 truncate">{itemSubtitle(item, type)}</p>
        {feedback && (
          <p className={`text-xs mt-1 font-medium ${feedback.ok ? 'text-green-600' : 'text-red-500'}`}>
            {feedback.message}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {travelerId && (
          <button
            onClick={onWishlist}
            disabled={isWishlisting}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            {isWishlisting ? 'Adding…' : 'Add to Experiences'}
          </button>
        )}
        {onBuildTrip && (
          <button
            onClick={onBuildTrip}
            className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-medium hover:bg-amber-200"
          >
            Build a trip
          </button>
        )}
        {tripId && (
          <button
            onClick={onItinerary}
            disabled={isItinerarying}
            className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 disabled:opacity-50"
          >
            {isItinerarying ? 'Adding…' : '+ Itinerary'}
          </button>
        )}
      </div>
    </li>
  )
}
