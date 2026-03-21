'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const REGIONS = [
  'Southeast',
  'Northeast',
  'Mid-Atlantic',
  'West Coast',
  'Europe',
  'Any',
]
const SOMETHINGS = [
  'Beach',
  'Concerts',
  'Food & dining',
  'History & culture',
  'Outdoors',
  'City break',
  'Other',
]
const VIBES = ['Relax', 'Adventure', 'Culture', 'Party', 'Family', 'Romantic', 'Mix']

type Recommendation = { name: string; state?: string; country: string }

/** Shape used for itinerary anchor (from API or inline). */
export interface ExperienceAnchorItem {
  id: string
  title: string
  concert?: { id: string; name: string; cityId?: string | null } | null
  hike?: {
    id: string
    name: string
    cityId?: string | null
    trailOrPlace?: string | null
  } | null
  dining?: { id: string; title?: string | null; cityId?: string | null } | null
  attraction?: { id: string; title?: string | null; cityId?: string | null } | null
}

function mapRowToAnchor(row: Record<string, unknown>): ExperienceAnchorItem {
  const concert = row.concert as ExperienceAnchorItem['concert']
  const hike = row.hike as ExperienceAnchorItem['hike']
  const dining = row.dining as ExperienceAnchorItem['dining']
  const attraction = row.attraction as ExperienceAnchorItem['attraction']
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    concert: concert
      ? {
          id: concert.id,
          name: concert.name,
          cityId: concert.cityId ?? null,
        }
      : null,
    hike: hike
      ? {
          id: hike.id,
          name: hike.name,
          cityId: hike.cityId ?? null,
          trailOrPlace: hike.trailOrPlace ?? null,
        }
      : null,
    dining: dining
      ? {
          id: dining.id,
          title: dining.title ?? null,
          cityId: dining.cityId ?? null,
        }
      : null,
    attraction: attraction
      ? {
          id: attraction.id,
          title: attraction.title ?? null,
          cityId: attraction.cityId ?? null,
        }
      : null,
  }
}

export interface ExperienceTripCreatorProps {
  tripCrewId: string
  initialTripId: string | null
  /** Load full experience from /api/wishlist (preferred). */
  experienceWishlistId?: string | null
  /** Optional inline anchor if not using experienceWishlistId. */
  initialItem?: ExperienceAnchorItem
  /** Destination-first flow (no saved experience). */
  forceCityFlow?: boolean
  /** Override default “back” target (default: experiences hub). */
  backHref?: string
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

function experienceTitle(item: ExperienceAnchorItem): string {
  return (
    item.concert?.name ||
    item.hike?.name ||
    item.dining?.title ||
    item.attraction?.title ||
    item.title
  )
}

function endDateForDuration(start: Date, kind: 'day' | 'weekend' | 'week'): Date {
  const end = new Date(start.getTime())
  if (kind === 'day') return end
  if (kind === 'weekend') {
    end.setDate(end.getDate() + 2)
    return end
  }
  end.setDate(end.getDate() + 6)
  return end
}

function anchorItineraryBody(item: ExperienceAnchorItem): {
  title: string
  type: string
  hikeId?: string
  concertId?: string
  diningId?: string
  attractionId?: string
} {
  if (item.hike?.id)
    return { title: item.hike.name, type: 'hike', hikeId: item.hike.id }
  if (item.concert?.id)
    return { title: item.concert.name, type: 'concert', concertId: item.concert.id }
  if (item.dining?.id)
    return {
      title: item.dining.title?.trim() || item.title,
      type: 'dining',
      diningId: item.dining.id,
    }
  if (item.attraction?.id)
    return {
      title: item.attraction.title?.trim() || item.title,
      type: 'attraction',
      attractionId: item.attraction.id,
    }
  return { title: item.title, type: 'other' }
}

function defaultSomethingFor(item: ExperienceAnchorItem): string {
  if (item.concert) return 'Concerts'
  if (item.hike) return 'Outdoors'
  if (item.dining) return 'Food & dining'
  return 'Other'
}

export default function ExperienceTripCreator({
  tripCrewId,
  initialTripId,
  experienceWishlistId,
  initialItem,
  forceCityFlow = false,
  backHref,
}: ExperienceTripCreatorProps) {
  const router = useRouter()

  const [hydratedItem, setHydratedItem] = useState<ExperienceAnchorItem | null>(null)
  const [hydrating, setHydrating] = useState(false)
  const [hydrateError, setHydrateError] = useState('')

  useEffect(() => {
    if (forceCityFlow || !experienceWishlistId) {
      setHydratedItem(null)
      setHydrateError('')
      setHydrating(false)
      return
    }
    const travelerId =
      typeof window !== 'undefined' ? localStorage.getItem('travelerId') : null
    if (!travelerId) {
      setHydrateError('Sign in to load this experience.')
      setHydrating(false)
      return
    }
    let cancelled = false
    setHydrating(true)
    setHydrateError('')
    fetch(
      `/api/wishlist?id=${encodeURIComponent(experienceWishlistId)}&travelerId=${encodeURIComponent(travelerId)}`
    )
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Failed to load experience')
        if (!data.item) throw new Error('Experience not found')
        if (!cancelled) setHydratedItem(mapRowToAnchor(data.item as Record<string, unknown>))
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setHydrateError(e instanceof Error ? e.message : 'Failed to load experience')
      })
      .finally(() => {
        if (!cancelled) setHydrating(false)
      })
    return () => {
      cancelled = true
    }
  }, [experienceWishlistId, forceCityFlow])

  const experienceItem = useMemo(
    () => hydratedItem ?? initialItem ?? null,
    [hydratedItem, initialItem]
  )

  const isExperienceFlow =
    !forceCityFlow && (Boolean(experienceItem) || Boolean(experienceWishlistId))

  const [step, setStep] = useState(1)
  const [expStep, setExpStep] = useState(1)
  const [tripId, setTripId] = useState<string | null>(initialTripId)
  const [whereText, setWhereText] = useState('')
  const [region, setRegion] = useState('')
  const [something, setSomething] = useState('')
  const [whoGoing, setWhoGoing] = useState('')
  const [vibes, setVibes] = useState('')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cityLoading, setCityLoading] = useState(false)
  const [tripStartDate, setTripStartDate] = useState(todayISO)
  const [durationKind, setDurationKind] = useState<'day' | 'weekend' | 'week'>('day')

  useEffect(() => {
    if (!experienceItem || forceCityFlow) return
    setSomething(defaultSomethingFor(experienceItem))
  }, [experienceItem, forceCityFlow])

  useEffect(() => {
    if (!experienceItem || forceCityFlow) {
      setCityLoading(false)
      return
    }
    setCityLoading(true)
    const cityId =
      experienceItem.concert?.cityId ||
      experienceItem.hike?.cityId ||
      experienceItem.dining?.cityId ||
      experienceItem.attraction?.cityId
    if (cityId) {
      fetch(`/api/cities?id=${cityId}`)
        .then((r) => r.json())
        .then((city) => {
          if (city?.name) {
            setWhereText(
              city.name +
                (city.state ? `, ${city.state}` : '') +
                (city.country ? `, ${city.country}` : '')
            )
          }
          setCityLoading(false)
        })
        .catch(() => setCityLoading(false))
    } else {
      const fallback =
        experienceItem.hike?.trailOrPlace ||
        experienceItem.hike?.name ||
        experienceItem.title
      if (fallback) setWhereText(fallback)
      setCityLoading(false)
    }
  }, [experienceItem, forceCityFlow])

  const ensureTrip = async () => {
    if (tripId) return tripId
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/tripcrew/${tripCrewId}/trips`, { method: 'GET' })
      const list = await res.json().catch(() => [])
      const planned = Array.isArray(list)
        ? list.find((t: { status?: string }) => t.status === 'PLANNED')
        : null
      if (planned?.id) {
        setTripId(planned.id)
        return planned.id
      }
      const travelerId =
        typeof window !== 'undefined' ? localStorage.getItem('travelerId') : null
      const createRes = await fetch(`/api/tripcrew/${tripCrewId}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createPlanned: true,
          tripName: 'Planning',
          purpose: 'Planning our trip',
          travelerId,
        }),
      })
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create trip')
      }
      const created = await createRes.json()
      const id = created.trip?.id || created.id
      if (id) setTripId(id)
      return id
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create trip'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }

  const handleGetRecommendations = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/plan/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whereText: whereText.trim(),
          region: region || undefined,
          something: something || undefined,
          whoGoing: whoGoing || undefined,
          vibes: vibes || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to get recommendations')
      }
      const data = await res.json()
      setRecommendations(data.suggestions || [])
      setStep(3)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not get recommendations')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRecommendation = async (rec: Recommendation) => {
    const tid = await ensureTrip()
    if (!tid) return
    setSaving(true)
    setError('')
    try {
      const cityRes = await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rec.name,
          state: rec.state || undefined,
          country: rec.country,
        }),
      })
      if (!cityRes.ok) {
        const err = await cityRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save city')
      }
      const city = await cityRes.json()

      const destRes = await fetch(`/api/trip/${tid}/destinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityId: city.id, name: rec.name }),
      })
      if (!destRes.ok) throw new Error('Failed to add destination to trip')
      router.push(`/trip/${tid}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateExperienceTrip = useCallback(async () => {
    if (!experienceItem) return
    const travelerId =
      typeof window !== 'undefined' ? localStorage.getItem('travelerId') : null
    if (!travelerId) {
      setError('Sign in to create a trip.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const start = new Date(`${tripStartDate}T12:00:00`)
      const end = endDateForDuration(start, durationKind)
      const title = experienceTitle(experienceItem)
      const purposeParts = [`Trip built around: ${title}.`]
      if (whoGoing.trim()) purposeParts.push(`Who: ${whoGoing.trim()}.`)
      if (vibes.trim()) purposeParts.push(`Vibe: ${vibes.trim()}.`)

      const createRes = await fetch(`/api/tripcrew/${tripCrewId}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createPlanned: true,
          tripName: title,
          purpose: purposeParts.join(' '),
          travelerId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
      })
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create trip')
      }
      const created = await createRes.json()
      const tid = created.trip?.id || created.id
      if (!tid) throw new Error('No trip id returned')

      const anchor = anchorItineraryBody(experienceItem)
      const itemRes = await fetch(`/api/trip/${tid}/itinerary-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: anchor.title,
          type: anchor.type,
          hikeId: anchor.hikeId,
          concertId: anchor.concertId,
          diningId: anchor.diningId,
          attractionId: anchor.attractionId,
          date: start.toISOString(),
        }),
      })
      if (!itemRes.ok) {
        const err = await itemRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to add experience to trip')
      }
      router.push(`/trip/${tid}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create trip')
    } finally {
      setSaving(false)
    }
  }, [experienceItem, tripCrewId, tripStartDate, durationKind, whoGoing, vibes, router])

  const landingPath =
    backHref ?? `/tripcrews/${tripCrewId}/experiences`
  const backToLanding = () => router.push(landingPath)

  if (isExperienceFlow && experienceWishlistId && hydrating) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <p className="text-sm text-gray-500">Loading your experience…</p>
      </div>
    )
  }

  if (isExperienceFlow && experienceWishlistId && hydrateError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-4">
        <p className="text-sm text-red-700">{hydrateError}</p>
        <button
          type="button"
          onClick={backToLanding}
          className="text-sky-600 hover:underline text-sm"
        >
          ← Back to saved experiences
        </button>
      </div>
    )
  }

  if (isExperienceFlow && !experienceItem) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <p className="text-sm text-gray-500">Select an experience to continue.</p>
        <button
          type="button"
          onClick={backToLanding}
          className="mt-4 text-sky-600 hover:underline text-sm"
        >
          ← Back
        </button>
      </div>
    )
  }

  if (isExperienceFlow && experienceItem) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-8">
          <button
            type="button"
            onClick={backToLanding}
            className="text-sky-600 hover:underline text-sm"
          >
            ← Back to experiences
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {expStep === 1 && 'When and who?'}
          {expStep === 2 && 'Create your trip'}
        </h1>
        <p className="text-gray-600 mb-6">
          {expStep === 1 &&
            'We’ll attach this experience to a new trip. You can add more on the trip page.'}
          {expStep === 2 && 'Review and save — you’ll land on your trip to keep planning.'}
        </p>

        <div className="mb-4 p-3 bg-sky-50 border border-sky-200 rounded-lg">
          <p className="text-sm text-sky-800">
            Planning around:{' '}
            <span className="font-medium">{experienceTitle(experienceItem)}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {cityLoading && (
          <p className="text-sm text-gray-500 mb-4">Loading location context…</p>
        )}

        {expStep === 1 && !cityLoading && (
          <div className="space-y-6">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Start date
              </span>
              <input
                type="date"
                value={tripStartDate}
                onChange={(e) => setTripStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </label>
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                Trip length
              </span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { k: 'day' as const, label: 'Day trip' },
                    { k: 'weekend' as const, label: 'Weekend' },
                    { k: 'week' as const, label: 'Week' },
                  ] as const
                ).map(({ k, label }) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDurationKind(k)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      durationKind === k
                        ? 'bg-sky-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Who&apos;s going?
              </span>
              <input
                type="text"
                value={whoGoing}
                onChange={(e) => setWhoGoing(e.target.value)}
                placeholder="e.g. family, friends, solo"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </label>
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">Vibe</span>
              <div className="flex flex-wrap gap-2">
                {VIBES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVibes(vibes === v ? '' : v)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      vibes === v
                        ? 'bg-sky-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setExpStep(2)}
              disabled={!tripStartDate}
              className="w-full px-4 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              Next — Review
            </button>
          </div>
        )}

        {expStep === 2 && (
          <div className="space-y-4">
            {whereText ? (
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">Location context: </span>
                {whereText}
              </p>
            ) : null}
            <p className="text-sm text-gray-600">
              Starts <span className="font-medium">{tripStartDate}</span>
              {durationKind === 'day' && ' · day trip'}
              {durationKind === 'weekend' && ' · weekend (3 days)'}
              {durationKind === 'week' && ' · week (7 days)'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpStep(1)}
                className="px-4 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateExperienceTrip}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create trip'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-8">
        <button
          type="button"
          onClick={backToLanding}
          className="text-sky-600 hover:underline text-sm"
        >
          ← Back to experiences
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        {step === 1 && 'Where would you like to go?'}
        {step === 2 && "Let's think through it"}
        {step === 3 && 'Pick a place to add to your trip'}
      </h1>
      <p className="text-gray-600 mb-6">
        {step === 1 && 'Tell us a bit and we’ll suggest regions and cities.'}
        {step === 2 && 'Narrow it down so we can recommend the best spots.'}
        {step === 3 && 'Save as a city and add it to your trip as a destination.'}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <textarea
            value={whereText}
            onChange={(e) => setWhereText(e.target.value)}
            placeholder="e.g. beach, summer concerts, DC, Europe..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            rows={3}
          />
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!whereText.trim()}
            className="w-full px-4 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next — Let’s think through it
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Where are you thinking?
            </label>
            <textarea
              value={whereText}
              onChange={(e) => setWhereText(e.target.value)}
              placeholder="e.g. beach, summer concerts, DC, Europe..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Choose region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Any</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Choose something
            </label>
            <select
              value={something}
              onChange={(e) => setSomething(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Any</option>
              {SOMETHINGS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Who&apos;s going?
            </label>
            <input
              type="text"
              value={whoGoing}
              onChange={(e) => setWhoGoing(e.target.value)}
              placeholder="e.g. family, friends, solo"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What vibes?
            </label>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVibes(vibes === v ? '' : v)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    vibes === v
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleGetRecommendations}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              {loading ? 'Getting recommendations…' : 'Get region recommendations'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={`${rec.name}-${rec.state ?? ''}-${rec.country}`}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div>
                <span className="font-medium">{rec.name}</span>
                {rec.state && <span className="text-gray-500">, {rec.state}</span>}
                <span className="text-gray-500"> — {rec.country}</span>
              </div>
              <button
                type="button"
                onClick={() => handleSelectRecommendation(rec)}
                disabled={saving}
                className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save city & add to trip'}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full mt-4 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
          >
            Back to refine
          </button>
        </div>
      )}
    </div>
  )
}
