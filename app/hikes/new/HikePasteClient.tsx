'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  HIKE_ROUTE_TYPES,
  HIKE_ROUTE_LABELS,
  type HikeParseResult,
} from '@/lib/hike-model'
import { getFirebaseAuth } from '@/lib/firebase'
import { LocalStorageAPI } from '@/lib/localStorage'

type FlowMode = 'discover' | 'paste'

async function resolveTravelerId(): Promise<string | null> {
  const stored = LocalStorageAPI.getTravelerId()
  if (stored) return stored
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  if (!user?.uid) return null
  const res = await fetch(`/api/auth/hydrate?firebaseId=${user.uid}`)
  const data = await res.json().catch(() => ({}))
  const traveler = data.traveler
  const tid = traveler?.id ?? null
  if (tid && traveler) LocalStorageAPI.setFullHydrationModel(traveler)
  return tid
}

function NumField(props: {
  label: string
  value: number | null
  onChange: (n: number | null) => void
  step?: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {props.label}
      </span>
      <input
        type="number"
        step={props.step ?? 'any'}
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        value={props.value ?? ''}
        onChange={(e) => {
          const v = e.target.value
          if (v === '') {
            props.onChange(null)
            return
          }
          const n = parseFloat(v)
          props.onChange(Number.isFinite(n) ? n : null)
        }}
      />
    </label>
  )
}

export default function HikePasteClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefCity = searchParams.get('city') ?? ''
  const prefState = searchParams.get('state') ?? ''
  const returnTo = searchParams.get('return') ?? ''

  const [mode, setMode] = useState<FlowMode>('discover')

  const [discoverPlace, setDiscoverPlace] = useState(prefCity || '')
  const [discoverState, setDiscoverState] = useState(prefState)
  const [discoverDifficulty, setDiscoverDifficulty] = useState('')
  const [discoverInterests, setDiscoverInterests] = useState('')
  const [suggestions, setSuggestions] = useState<HikeParseResult[] | null>(null)
  const [loadingRecs, setLoadingRecs] = useState(false)

  const [pasteHint, setPasteHint] = useState(
    [prefCity, prefState].filter(Boolean).join(', ')
  )
  const [pastedDescription, setPastedDescription] = useState('')
  const [sourcePaste, setSourcePaste] = useState('')
  const [draft, setDraft] = useState<HikeParseResult | null>(null)
  const [catalogCityName, setCatalogCityName] = useState('')
  const [catalogCityState, setCatalogCityState] = useState(prefState)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backHref = returnTo || '/'

  const applyParsed = useCallback(
    (p: HikeParseResult, catalogName?: string, catalogState?: string) => {
      setDraft(p)
      setCatalogCityName(
        catalogName ??
          p.nearestTown ??
          prefCity ??
          discoverPlace.split(',')[0]?.trim() ??
          ''
      )
      setCatalogCityState(
        catalogState ?? p.nearestState ?? prefState ?? discoverState
      )
    },
    [prefCity, prefState, discoverPlace, discoverState]
  )

  const fetchRecommendations = async () => {
    setError(null)
    setSuggestions(null)
    setLoadingRecs(true)
    try {
      const res = await fetch('/api/hikes/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place: discoverPlace.trim(),
          state: discoverState.trim() || undefined,
          difficulty: discoverDifficulty.trim() || undefined,
          interests: discoverInterests.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Recommendations failed')
      setError(null)
      setSuggestions(data.suggestions ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoadingRecs(false)
    }
  }

  function applySuggestion(s: HikeParseResult) {
    setSourcePaste('ai_discovery')
    applyParsed(s)
    setError(null)
  }

  const parsePaste = async () => {
    setError(null)
    setParsing(true)
    try {
      const res = await fetch('/api/hikes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionHint: pasteHint.trim() || undefined,
          pastedDescription: pastedDescription.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Parse failed')
      setSourcePaste(pastedDescription.trim())
      applyParsed(data.parsed as HikeParseResult)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setParsing(false)
    }
  }

  const save = async () => {
    if (!draft?.name?.trim()) {
      setError('Trail name is required')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/hikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          catalogCityName: catalogCityName.trim() || undefined,
          catalogCityState: catalogCityState.trim() || undefined,
          sourcePaste:
            sourcePaste === 'ai_discovery'
              ? `AI discovery: ${discoverPlace}${discoverState ? `, ${discoverState}` : ''}. ${discoverInterests ? `Interests: ${discoverInterests}` : ''}`
              : sourcePaste || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      const hikeId = data.hike?.id as string | undefined
      const title = draft.name.trim()
      if (hikeId && title) {
        const tid = await resolveTravelerId()
        if (tid) {
          const wl = await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              travelerId: tid,
              title,
              hikeId,
            }),
          })
          if (!wl.ok) {
            console.warn('Hike saved but wishlist bookmark failed', await wl.json().catch(() => ({})))
          }
        }
      }
      router.push(backHref)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const updateDraft = useCallback(
    <K extends keyof HikeParseResult>(key: K, value: HikeParseResult[K]) => {
      setDraft((d) => (d ? { ...d, [key]: value } : d))
    },
    []
  )

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link
        href={backHref}
        className="text-sm text-sky-600 hover:text-sky-800 font-medium mb-6 inline-block"
      >
        ← Back
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Add a hike</h1>
      <p className="text-gray-500 text-sm mb-6">
        Two different jobs: <strong className="text-gray-700">Discover</strong> ideas from a
        short form (AI suggests 3–4 trails), or <strong className="text-gray-700">Paste</strong>{' '}
        text you already have (e.g. AllTrails) to structure and save to the catalogue.
      </p>

      <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1 mb-8">
        <button
          type="button"
          onClick={() => {
            setMode('discover')
            setError(null)
          }}
          className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg transition ${
            mode === 'discover'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Discover trails
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('paste')
            setError(null)
          }}
          className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg transition ${
            mode === 'paste'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Paste &amp; save to DB
        </button>
      </div>

      {mode === 'discover' && (
        <div className="space-y-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-600">
            Tell us where and what you&apos;re in the mood for. We&apos;ll ask the model for a
            handful of plausible trail ideas — not a map search, just structured suggestions you
            can edit and save.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Place / region
              </span>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. Sedona, North Cascades, near Asheville"
                value={discoverPlace}
                onChange={(e) => setDiscoverPlace(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                State (optional)
              </span>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. AZ, WA"
                value={discoverState}
                onChange={(e) => setDiscoverState(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Difficulty (optional)
              </span>
              <select
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={discoverDifficulty}
                onChange={(e) => setDiscoverDifficulty(e.target.value)}
              >
                <option value="">No preference</option>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
                <option value="strenuous">Strenuous</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                What do you want to see?
              </span>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g. waterfalls, alpine views, red rocks, lake loop, dog-friendly"
                value={discoverInterests}
                onChange={(e) => setDiscoverInterests(e.target.value)}
              />
            </label>
          </div>
          {error && mode === 'discover' && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}
          <button
            type="button"
            onClick={fetchRecommendations}
            disabled={loadingRecs || discoverPlace.trim().length < 2}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-40"
          >
            {loadingRecs ? 'Getting ideas…' : 'Get 3–4 trail ideas'}
          </button>

          {suggestions && suggestions.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Suggestions — pick one to review &amp; save
              </h2>
              <ul className="space-y-2">
                {suggestions.map((s, i) => (
                  <li
                    key={`${s.name}-${i}`}
                    className="border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[s.trailOrPlace, s.difficulty, s.distanceMi != null ? `${s.distanceMi} mi` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {s.notes && (
                        <p className="text-xs text-gray-600 mt-1">{s.notes}</p>
                      )}
                      {(s.nearestTown || s.nearestState) && (
                        <p className="text-xs text-emerald-700 mt-1">
                          Near {s.nearestTown}
                          {s.nearestState ? `, ${s.nearestState}` : ''}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                    >
                      Use this trail
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {mode === 'paste' && (
        <div className="space-y-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-600">
            You already have the write-up — we extract fields the same way as GoFast workout
            paste, then you confirm before saving to the catalogue.
          </p>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Trail description (required)
            </span>
            <textarea
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[160px] font-mono"
              placeholder="Paste from AllTrails, park website, or describe the trail…"
              value={pastedDescription}
              onChange={(e) => setPastedDescription(e.target.value)}
            />
          </label>
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
              Optional: short hint if the paste is vague
            </summary>
            <p className="text-xs text-gray-500 mt-2 mb-2">
              Only if the paste is a trail name or very thin — we prepend this line for the
              parser. Skip if your paste already includes location or park details.
            </p>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. near Boulder CO"
              value={pasteHint}
              onChange={(e) => setPasteHint(e.target.value)}
            />
          </details>
          {error && mode === 'paste' && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}
          <button
            type="button"
            onClick={parsePaste}
            disabled={parsing || pastedDescription.trim().length < 20}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-40"
          >
            {parsing ? 'Parsing…' : 'Parse with AI'}
          </button>
        </div>
      )}

      {draft && (
        <div className="mt-8 space-y-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Review &amp; edit
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Trail name
              </span>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={draft.name}
                onChange={(e) => updateDraft('name', e.target.value)}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Park / area
              </span>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={draft.trailOrPlace ?? ''}
                onChange={(e) =>
                  updateDraft('trailOrPlace', e.target.value.trim() || null)
                }
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Difficulty
              </span>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={draft.difficulty ?? ''}
                onChange={(e) =>
                  updateDraft('difficulty', e.target.value.trim() || null)
                }
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Route type
              </span>
              <select
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={draft.routeType ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  updateDraft(
                    'routeType',
                    v === '' ? null : (v as HikeParseResult['routeType'])
                  )
                }}
              >
                <option value="">—</option>
                {HIKE_ROUTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {HIKE_ROUTE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <NumField
              label="Distance (mi)"
              value={draft.distanceMi}
              onChange={(n) => updateDraft('distanceMi', n)}
            />
            <NumField
              label="Duration (min)"
              value={draft.durationMin}
              step="1"
              onChange={(n) => updateDraft('durationMin', n)}
            />
            <NumField
              label="Trailhead lat"
              value={draft.trailheadLat}
              onChange={(n) => updateDraft('trailheadLat', n)}
            />
            <NumField
              label="Trailhead lng"
              value={draft.trailheadLng}
              onChange={(n) => updateDraft('trailheadLng', n)}
            />
            <label className="block">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Nearest town
              </span>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={draft.nearestTown ?? ''}
                onChange={(e) =>
                  updateDraft('nearestTown', e.target.value.trim() || null)
                }
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                State / region
              </span>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={draft.nearestState ?? ''}
                onChange={(e) =>
                  updateDraft('nearestState', e.target.value.trim() || null)
                }
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                URL
              </span>
              <input
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={draft.url ?? ''}
                onChange={(e) =>
                  updateDraft('url', e.target.value.trim() || null)
                }
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Notes
              </span>
              <textarea
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[72px]"
                value={draft.notes ?? ''}
                onChange={(e) =>
                  updateDraft('notes', e.target.value.trim() || null)
                }
              />
            </label>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs text-gray-500">
              Catalogue city (where this hike appears in Discover). Defaults from nearest
              town; override if needed.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Catalogue city name
                </span>
                <input
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={catalogCityName}
                  onChange={(e) => setCatalogCityName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  State
                </span>
                <input
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={catalogCityState}
                  onChange={(e) => setCatalogCityState(e.target.value)}
                />
              </label>
            </div>
          </div>

          {error && draft && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={
              saving ||
              !draft.name.trim() ||
              !(catalogCityName.trim() || draft.nearestTown?.trim())
            }
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save to catalogue'}
          </button>
        </div>
      )}
    </div>
  )
}
