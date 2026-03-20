'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  HIKE_ROUTE_TYPES,
  HIKE_ROUTE_LABELS,
  type HikeParseResult,
} from '@/lib/hike-model'

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

  const [regionHint, setRegionHint] = useState(
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

  const applyParsed = useCallback((p: HikeParseResult) => {
    setDraft(p)
    setCatalogCityName(p.nearestTown ?? prefCity ?? '')
    setCatalogCityState(p.nearestState ?? prefState ?? '')
  }, [prefCity, prefState])

  const parse = async () => {
    setError(null)
    setParsing(true)
    try {
      const res = await fetch('/api/hikes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionHint: regionHint.trim() || undefined,
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
          sourcePaste: sourcePaste || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
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
      <p className="text-gray-500 text-sm mb-8">
        Paste an AllTrails blurb or any trail write-up. We use the same style of AI JSON
        extraction as GoFast workout paste — then you can edit before saving to the city
        catalogue.
      </p>

      <div className="space-y-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <label className="block">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Where are you thinking of hiking? (optional context)
          </span>
          <input
            type="text"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="e.g. Boulder, Sedona, near Portland"
            value={regionHint}
            onChange={(e) => setRegionHint(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Paste trail description
          </span>
          <textarea
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[160px] font-mono"
            placeholder="Paste from AllTrails, park website, or describe the trail…"
            value={pastedDescription}
            onChange={(e) => setPastedDescription(e.target.value)}
          />
        </label>

        {error && (
          <p className="text-sm text-red-600 font-medium">{error}</p>
        )}

        <button
          type="button"
          onClick={parse}
          disabled={parsing || pastedDescription.trim().length < 20}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-40"
        >
          {parsing ? 'Parsing…' : 'Parse with AI'}
        </button>
      </div>

      {draft && (
        <div className="mt-8 space-y-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Review & edit
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
