'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { experiencePaths } from '@/lib/experience-routes'
import { LocalStorageAPI } from '@/lib/localStorage'
import type { ParsedTripPlan } from '@/lib/trip-plan-model'

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

  const [tripName, setTripName] = useState('')
  const [where, setWhere] = useState('')
  const [city, setCity] = useState('')
  const [stateUS, setStateUS] = useState('')
  const [country, setCountry] = useState('')
  const [startDate, setStartDate] = useState(todayISO)
  const [endDate, setEndDate] = useState(weekAheadISO)
  const [whoWith, setWhoWith] = useState('')
  const [transportMode, setTransportMode] = useState('')

  const [pasteOpen, setPasteOpen] = useState(false)
  const [blobText, setBlobText] = useState('')
  const [parsing, setParsing] = useState(false)
  /** Legs / lodging / notes from last successful AI parse (applied on create). */
  const [importedPlan, setImportedPlan] = useState<ParsedTripPlan | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleParse() {
    setError('')
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setParsing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const tid = LocalStorageAPI.getTravelerId()
    if (!tid) {
      setError('Sign in to create a trip.')
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
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to create trip')
      const id = data.trip?.id || data.id
      if (!id) throw new Error('No trip id returned')
      router.push(`/trip/${id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const importHint =
    importedPlan &&
    (importedPlan.legs.length > 0 || importedPlan.lodging != null) &&
    `Including ${importedPlan.legs.length} logistics item(s)${
      importedPlan.lodging?.title ? ` and stay at ${importedPlan.lodging.title}` : ''
    }.`

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link
        href={paths.planFork}
        className="text-sm text-sky-600 hover:underline font-medium mb-6 inline-block"
      >
        ← Planner
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter trip details</h1>
      <p className="text-gray-600 text-sm mb-6">
        Create a trip with name, place, and dates. Optionally paste an itinerary — we&apos;ll extract
        flights and hotels into logistics and lodging when you create the trip.
      </p>

      {error ? (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-6 border border-gray-200 rounded-xl bg-gray-50/80 overflow-hidden">
        <button
          type="button"
          onClick={() => setPasteOpen((o) => !o)}
          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-800 flex justify-between items-center hover:bg-gray-100/80"
        >
          <span>Paste itinerary (AI)</span>
          <span className="text-gray-400">{pasteOpen ? '−' : '+'}</span>
        </button>
        {pasteOpen ? (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-200 bg-white">
            <p className="text-xs text-gray-500 pt-3">
              Confirmation emails, bullet lists, or notes with dates, lodging, and flights work well.
            </p>
            <textarea
              value={blobText}
              onChange={(e) => setBlobText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              placeholder="Paste here…"
            />
            <button
              type="button"
              onClick={handleParse}
              disabled={parsing || blobText.trim().length < 20}
              className="w-full px-3 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              {parsing ? 'Parsing…' : 'Fill form from paste'}
            </button>
          </div>
        ) : null}
      </div>

      {importHint ? (
        <p className="text-xs text-emerald-700 mb-4" role="status">
          {importHint}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
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

        <button
          type="submit"
          disabled={saving}
          className="w-full px-4 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create trip'}
        </button>
      </form>
    </div>
  )
}

export default function TravelerPlanGotPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-10">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <EnterTripDetailsInner />
    </Suspense>
  )
}
