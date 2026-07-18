'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  emptyTripIngestDraft,
  type TripIngestDraft,
} from '@/lib/trip-ingest-types'
import { draftFromParsedTripPlan } from '@/lib/trip-ingest-map'
import {
  TRIP_CORE_CSV_TEMPLATE,
  parseTripCoreCsv,
} from '@/lib/trip-core-csv'
import { LocalStorageAPI } from '@/lib/localStorage'
import type { ParsedTripPlan } from '@/lib/trip-plan-model'
import { ingestDraftLooksLikeConcert } from '@/lib/trip/detectConcertTrip'
import DestinationFields from '@/app/components/trip/setup/DestinationFields'

type IngestTab = 'paste' | 'csv' | 'manual'

function TripReviewCard({
  draft,
  onChange,
  onCreate,
  creating,
  createLabel = 'Create trip & open setup',
}: {
  draft: TripIngestDraft
  onChange: (next: TripIngestDraft) => void
  onCreate: () => void
  creating: boolean
  createLabel?: string
}) {
  function patch(patch: Partial<TripIngestDraft>) {
    onChange({ ...draft, ...patch })
  }

  const concertDetected = ingestDraftLooksLikeConcert(draft)
  const anchor = draft.importedPlan?.eventAnchor

  return (
    <div className="mt-6 rounded-lg border border-green-200 bg-green-50/80 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-green-900">Trip draft ready</p>
        <p className="mt-1 text-xs text-green-800">
          Review title, purpose, destination, and dates — then create the trip and continue in
          setup wizard.
        </p>
        {concertDetected ? (
          <p className="mt-2 text-xs font-medium text-purple-900 bg-purple-100 border border-purple-200 rounded-md px-2 py-1 inline-block">
            Concert / festival detected
            {anchor?.name ? ` — ${anchor.name}` : ''}
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-sky-200 bg-white p-4 space-y-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Trip title <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={draft.tripName}
            onChange={(e) => patch({ tripName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Trip purpose</span>
          <textarea
            value={draft.purpose}
            onChange={(e) => patch({ purpose: e.target.value })}
            rows={3}
            placeholder="Why you are going — edit or generate later in setup"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </label>

        <DestinationFields
          city={draft.city}
          state={draft.state}
          country={draft.country}
          onChange={(p) => patch(p)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Trip start</span>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Trip end</span>
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => patch({ endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Leaving from</span>
          <input
            type="text"
            value={draft.startingLocation}
            onChange={(e) => patch({ startingLocation: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={creating || !draft.tripName.trim()}
        onClick={onCreate}
        className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {creating ? 'Creating…' : createLabel}
        <span aria-hidden>→</span>
      </button>
    </div>
  )
}

export default function TripSetupIngest() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [ingestTab, setIngestTab] = useState<IngestTab>('paste')
  const [rawText, setRawText] = useState('')
  const [csvText, setCsvText] = useState('')
  const [manualDraft, setManualDraft] = useState<TripIngestDraft>(emptyTripIngestDraft())
  const [draft, setDraft] = useState<TripIngestDraft | null>(null)
  const [parsing, setParsing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const tabBtn = (tab: IngestTab, label: string) => (
    <button
      type="button"
      onClick={() => {
        setIngestTab(tab)
        setError('')
      }}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        ingestTab === tab
          ? 'bg-sky-600 text-white shadow'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  )

  async function createTripFromDraft(nextDraft: TripIngestDraft) {
    setError('')
    if (!nextDraft.tripName.trim()) {
      setError('Trip title is required.')
      return
    }

    const travelerId = LocalStorageAPI.getTravelerId()
    if (!travelerId) {
      setError('Sign in to create a trip.')
      return
    }

    setCreating(true)
    try {
      const plan = nextDraft.importedPlan
      const isConcertTrip = ingestDraftLooksLikeConcert(nextDraft)
      const body: Record<string, unknown> = {
        travelerId,
        setupOrigin: isConcertTrip ? 'CONCERT_INGEST' : 'GENERIC',
        tripName: nextDraft.tripName.trim(),
        purpose: nextDraft.purpose.trim() || nextDraft.notes.trim() || null,
        city: nextDraft.city.trim() || null,
        state: nextDraft.state.trim() || null,
        country: nextDraft.country.trim() || null,
        startDate: nextDraft.startDate || undefined,
        endDate: nextDraft.endDate || undefined,
        startingLocation: nextDraft.startingLocation.trim() || null,
        notes: nextDraft.notes.trim() || nextDraft.purpose.trim() || null,
      }

      if (plan) {
        body.lodging = plan.lodging ?? null
        body.legs = plan.legs ?? []
        body.experiences = plan.experiences ?? []
        body.daySlots = plan.daySlots ?? []
        body.eventAnchor = plan.eventAnchor ?? null
      }

      const res = await fetch('/api/traveler/trips/ingest-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to create trip')

      const tripId = data.tripId as string
      router.push(`/trip/${tripId}/admin?ingested=1`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create trip')
    } finally {
      setCreating(false)
    }
  }

  async function handleParse() {
    setError('')
    if (!rawText.trim() || rawText.trim().length < 20) {
      setError('Paste at least 20 characters to parse.')
      return
    }
    setParsing(true)
    try {
      const res = await fetch('/api/plan/parse-blob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blob: rawText }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Parse failed')
      const plan = data.parsed as ParsedTripPlan
      setDraft(draftFromParsedTripPlan(plan))
      setRawText('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setParsing(false)
    }
  }

  function handleCsvImport() {
    setError('')
    const result = parseTripCoreCsv(csvText)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDraft(result.draft)
  }

  function handleCsvFile(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      setCsvText(text)
      setError('')
      const result = parseTripCoreCsv(text)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDraft(result.draft)
    }
    reader.onerror = () => setError('Could not read CSV file.')
    reader.readAsText(file)
  }

  const activeDraft =
    ingestTab === 'manual' ? manualDraft : draft

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/home" className="text-sm text-gray-500 hover:text-gray-800 mb-6 inline-block">
        ← Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Trip setup</h1>
      <p className="mt-2 text-sm text-gray-600 max-w-2xl">
        Start with AI paste, CSV import, or a blank trip — review your draft, then open the setup
        wizard for flights, stay, essentials, and things to do.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabBtn('paste', 'AI paste')}
        {tabBtn('csv', 'Import CSV')}
        {tabBtn('manual', 'Manual (blank)')}
      </div>

      {error ? (
        <p
          className="mt-4 text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {ingestTab === 'paste' ? (
        <div className="mt-6 rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">AI paste / parse</h2>
          <p className="mt-1 text-sm text-gray-600">
            Paste itinerary email, confirmation details, hotel + flight notes — AI extracts trip
            title, dates, destination, lodging, and flights into a reviewable draft.
          </p>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={12}
            placeholder="Paste travel confirmation, itinerary, or trip notes…"
            className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="button"
            onClick={() => void handleParse()}
            disabled={parsing || rawText.trim().length < 20}
            className="mt-4 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50"
          >
            {parsing ? 'Parsing…' : 'Parse with AI'}
          </button>

          {draft && ingestTab === 'paste' ? (
            <TripReviewCard
              draft={draft}
              onChange={setDraft}
              creating={creating}
              onCreate={() => void createTripFromDraft(draft)}
            />
          ) : null}
        </div>
      ) : null}

      {ingestTab === 'csv' ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Import CSV</h2>
          <p className="text-sm text-gray-600">
            Paste or upload a single trip row. The first data row becomes your draft.
          </p>
          <p className="text-xs text-gray-500 font-mono bg-gray-50 border border-gray-100 rounded px-3 py-2 break-all">
            {TRIP_CORE_CSV_TEMPLATE}
          </p>
          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value)
              setDraft(null)
            }}
            rows={8}
            placeholder="Paste CSV with header row…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCsvImport}
              disabled={!csvText.trim()}
              className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              Import CSV row
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleCsvFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Upload CSV file
            </button>
          </div>

          {draft && ingestTab === 'csv' ? (
            <TripReviewCard
              draft={draft}
              onChange={setDraft}
              creating={creating}
              onCreate={() => void createTripFromDraft(draft)}
            />
          ) : null}
        </div>
      ) : null}

      {ingestTab === 'manual' ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Manual (blank)</h2>
          <p className="mt-1 text-sm text-gray-600">
            Enter minimal trip details — flights, stay, and POI come next in the setup wizard.
          </p>
          <TripReviewCard
            draft={manualDraft}
            onChange={setManualDraft}
            creating={creating}
            onCreate={() => void createTripFromDraft(manualDraft)}
          />
        </div>
      ) : null}

      <p className="mt-8 text-xs text-gray-400">
        Concert-specific ingest still lives at{' '}
        <Link href="/experiences/concerts/ingest" className="text-sky-600 hover:underline">
          Experiences → Concerts
        </Link>
        . This path is for general travel trips.
      </p>
    </div>
  )
}
