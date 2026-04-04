'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { experiencePaths } from '@/lib/experience-routes'
import { LocalStorageAPI } from '@/lib/localStorage'
import type { ParsedTripPlan } from '@/lib/trip-plan-model'

type InputMode = 'manual' | 'parse'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

function weekAheadISO() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

function EnterTripDetailsInner() {
  const router = useRouter()
  const paths = experiencePaths()

  const [inputMode, setInputMode] = useState<InputMode>('manual')

  const [tripName, setTripName] = useState('')
  const [where, setWhere] = useState('')
  const [city, setCity] = useState('')
  const [stateUS, setStateUS] = useState('')
  const [country, setCountry] = useState('')
  const [startDate, setStartDate] = useState(todayISO)
  const [endDate, setEndDate] = useState(weekAheadISO)
  const [whoWith, setWhoWith] = useState('')
  const [transportMode, setTransportMode] = useState('')
  const [travelingFrom, setTravelingFrom] = useState('')
  const [travelingFromIsHomeDefault, setTravelingFromIsHomeDefault] = useState(false)

  const [blobText, setBlobText] = useState('')
  const [parsing, setParsing] = useState(false)
  /** Legs / lodging / notes from last successful AI parse (applied on create). */
  const [importedPlan, setImportedPlan] = useState<ParsedTripPlan | null>(null)
  const [parseSuccess, setParseSuccess] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const tid = LocalStorageAPI.getTravelerId()
    if (!tid) return
    void fetch(`/api/traveler/profile?travelerId=${encodeURIComponent(tid)}`)
      .then((r) => r.json())
      .then((d: { hometownCity?: string; homeState?: string; homeAddress?: string; error?: string }) => {
        if (!d || d.error) return
        const parts = [d.hometownCity, d.homeState].filter(Boolean)
        const line =
          parts.length > 0 ? parts.join(', ') : (typeof d.homeAddress === 'string' ? d.homeAddress.trim() : '')
        if (line) {
          setTravelingFrom(line)
          setTravelingFromIsHomeDefault(true)
        }
      })
      .catch(() => {})
  }, [])

  async function handleParse() {
    setError('')
    setParseSuccess(false)
    setParsing(true)
    try {
      const res = await fetch('/api/plan/parse-blob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blob: blobText }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Parse failed')
      const p = data.parsed as ParsedTripPlan
      if (!p) throw new Error('Invalid parse response')

      if (p.tripName?.trim()) setTripName(p.tripName.trim())
      if (p.startDate) setStartDate(p.startDate)
      if (p.endDate) setEndDate(p.endDate)
      if (p.city?.trim()) setCity(p.city.trim())
      if (p.state?.trim()) setStateUS(p.state.trim())
      if (p.country?.trim()) setCountry(p.country.trim())
      if (p.whereFreeform?.trim() && !p.city) setWhere(p.whereFreeform.trim())
      if (p.whoWith) setWhoWith(p.whoWith)
      if (p.transportMode) setTransportMode(p.transportMode)

      setImportedPlan(p)
      setParseSuccess(true)
      setInputMode('manual')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setParsing(false)
    }
  }

  async function persistTrip(redirectTo: 'trip' | 'admin'): Promise<void> {
    setError('')
    const tid = LocalStorageAPI.getTravelerId()
    if (!tid) {
      setError('Sign in to save or create a trip.')
      return
    }
    if (!tripName.trim()) {
      setError('Enter a trip name.')
      return
    }
    const start = new Date(`${startDate}T12:00:00`)
    const end = new Date(`${endDate}T12:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Invalid dates.')
      return
    }
    if (end.getTime() < start.getTime()) {
      setError('End date must be on or after start date.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/traveler/trips/ingest-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelerId: tid,
          tripName: tripName.trim(),
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          city: city.trim() || null,
          state: stateUS.trim() || null,
          country: country.trim() || null,
          whereFreeform: where.trim() || null,
          whoWith: whoWith || null,
          transportMode: transportMode || null,
          lodging: importedPlan?.lodging ?? null,
          legs: importedPlan?.legs ?? [],
          notes: importedPlan?.notes?.trim() || null,
          startingLocation: travelingFrom.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save trip')
      const id = data.trip?.id || data.id
      if (!id) throw new Error('No trip id returned')
      router.push(redirectTo === 'admin' ? `/trip/${id}/admin` : `/trip/${id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void persistTrip('trip')
  }

  function handleSave() {
    void persistTrip('admin')
  }

  const importHint =
    importedPlan &&
    (importedPlan.legs.length > 0 || importedPlan.lodging != null) &&
    `Including ${importedPlan.legs.length} logistics item(s)${
      importedPlan.lodging?.title ? ` and stay at ${importedPlan.lodging.title}` : ''
    }.`

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link
        href={paths.planFork}
        className="text-sm text-sky-600 hover:underline font-medium mb-6 inline-block"
      >
        ← Planner
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter trip details</h1>
      <p className="text-gray-600 text-sm mb-6">
        Choose how you want to enter your trip. You can switch tabs anytime; your draft stays in the form
        below.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Trip context</p>
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-medium text-gray-900">Traveling from</span>
              {travelingFromIsHomeDefault ? (
                <span className="ml-1.5 text-xs font-medium text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                  Home default
                </span>
              ) : null}
            </p>
            <p className="text-sm text-gray-600">
              {travelingFrom.trim() || (
                <span className="text-amber-700">
                  Not set — add city/state in{' '}
                  <Link href="/profile/settings" className="underline font-medium">
                    Profile settings
                  </Link>{' '}
                  or type in the form.
                </span>
              )}
            </p>
          </div>
          {importedPlan &&
          (importedPlan.legs.length > 0 ||
            importedPlan.lodging?.title ||
            importedPlan.notes?.trim()) ? (
            <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2">
                From your paste
              </p>
              {importedPlan.lodging?.title ? (
                <p className="text-sm text-amber-950 mb-2">
                  <span className="font-medium">Stay:</span> {importedPlan.lodging.title}
                </p>
              ) : null}
              {importedPlan.legs.length > 0 ? (
                <ul className="text-xs text-amber-950 space-y-1.5">
                  {importedPlan.legs.map((leg, i) => (
                    <li key={i} className="border-l-2 border-amber-400 pl-2">
                      <span className="font-medium capitalize">{leg.kind}:</span>{' '}
                      {leg.summary || leg.origin || leg.destination || '—'}
                    </li>
                  ))}
                </ul>
              ) : null}
              {importedPlan.notes?.trim() ? (
                <p className="text-xs text-amber-900 mt-2">{importedPlan.notes.trim()}</p>
              ) : null}
            </div>
          ) : null}
        </aside>

        <div className="lg:col-span-2 space-y-6">
      {/* Input method — same pattern as GoFastCompany race create (Manual / Paste & Parse) */}
      <div className="mb-2 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <span className="text-sm font-medium text-gray-700 shrink-0">Input method</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setInputMode('manual')
                setError('')
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2 ${
                inputMode === 'manual'
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-base leading-none" aria-hidden>
                ≡
              </span>
              Manual entry
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('parse')
                setError('')
                setParseSuccess(false)
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2 ${
                inputMode === 'parse'
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-base leading-none" aria-hidden>
                ✦
              </span>
              Paste &amp; parse
            </button>
          </div>
        </div>
      </div>

      {parseSuccess && inputMode === 'manual' ? (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-900 font-medium">Parsed from your paste</p>
          <p className="text-xs text-emerald-800 mt-1">
            Review and edit the fields below, then create the trip. Open{' '}
            <strong className="font-medium">Paste &amp; parse</strong> again if you need another paste.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {error}
        </p>
      ) : null}

      {inputMode === 'parse' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1 inline-flex items-center gap-2">
            <span className="text-sky-600" aria-hidden>
              ✦
            </span>
            Paste itinerary
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Copy confirmation emails, bullet lists, or notes with dates, lodging, and flights. AI fills
            the form and adds flights or hotels when you create the trip (at least 20 characters).
          </p>
          <textarea
            value={blobText}
            onChange={(e) => setBlobText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Paste your itinerary here…"
            aria-label="Itinerary text to parse"
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void handleParse()}
              disabled={parsing || blobText.trim().length < 20}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {parsing ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                  Parsing…
                </>
              ) : (
                <>
                  <span aria-hidden>✦</span>
                  Parse with AI
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}

      {importHint ? (
        <p className="text-xs text-emerald-700 mb-4" role="status">
          {importHint}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Trip details</p>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Trip name</span>
          <input
            type="text"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="e.g. Spring break"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Traveling from
          </span>
          <input
            type="text"
            value={travelingFrom}
            onChange={(e) => {
              setTravelingFrom(e.target.value)
              setTravelingFromIsHomeDefault(false)
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <span className="text-xs text-gray-500 mt-1 block">
            Defaults from your profile; we save this as the trip departure point.
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block sm:col-span-1">
            <span className="block text-sm font-medium text-gray-700 mb-1">City</span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="block text-sm font-medium text-gray-700 mb-1">State / region</span>
            <input
              type="text"
              value={stateUS}
              onChange={(e) => setStateUS(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="block text-sm font-medium text-gray-700 mb-1">Country</span>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Where (freeform, optional)
          </span>
          <input
            type="text"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="e.g. Amalfi Coast — use if you prefer one line"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">End date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Who with (optional)</span>
            <select
              value={whoWith}
              onChange={(e) => setWhoWith(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">—</option>
              <option value="SOLO">Solo</option>
              <option value="SPOUSE">Spouse / partner</option>
              <option value="FRIENDS">Friends</option>
              <option value="FAMILY">Family</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Main transport (optional)
            </span>
            <select
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">—</option>
              <option value="PLANE">Plane</option>
              <option value="CAR">Car</option>
              <option value="BOAT">Boat</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-3 border border-gray-300 bg-white text-gray-800 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:flex-1 px-4 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? 'Working…' : 'Create trip'}
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center sm:text-right">
          Save creates your trip and opens trip admin to keep planning. Create trip opens your trip page.
        </p>
      </form>
        </div>
      </div>
    </div>
  )
}

export default function TravelerPlanGotPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <EnterTripDetailsInner />
    </Suspense>
  )
}
