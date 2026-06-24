'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import ConcertTripWizard from '@/app/components/planner/ConcertTripWizard'
import {
  type ConcertCoreFields,
  type ConcertIngestDraft,
  coreFromDraft,
  emptyConcertCore,
} from '@/app/components/planner/concert-ingest-types'
import { draftFromParsedTripPlan } from '@/lib/concert-ingest-map'
import {
  CONCERT_CORE_CSV_TEMPLATE,
  parseConcertCoreCsv,
} from '@/lib/concert-core-csv'
import { concertsListPath } from '@/lib/experience-routes'
import type { ParsedTripPlan } from '@/lib/trip-plan-model'

type IngestTab = 'paste' | 'csv' | 'manual'

function CoreReviewCard({
  draft,
  onChange,
  onContinue,
  continueLabel = 'Continue to concert wizard',
}: {
  draft: ConcertIngestDraft
  onChange: (next: ConcertIngestDraft) => void
  onContinue: () => void
  continueLabel?: string
}) {
  const core = coreFromDraft(draft)

  function patchCore(patch: Partial<ConcertCoreFields>) {
    onChange({ ...draft, ...patch })
  }

  return (
    <div className="mt-6 rounded-lg border border-green-200 bg-green-50/80 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-green-900">Concert Core ready</p>
        <p className="mt-1 text-xs text-green-800">
          Review source identity fields, then continue into the trip wizard for schedule, dates,
          lodging, and POI.
        </p>
      </div>

      <div className="rounded-lg border border-sky-200 bg-white p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Concert core</h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Name is required. City, venue, and event start date are recommended.
          </p>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Concert / event name <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={core.concertName}
            onChange={(e) => patchCore({ concertName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Artist / headliner</span>
            <input
              type="text"
              value={core.artist}
              onChange={(e) => patchCore({ artist: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Venue</span>
            <input
              type="text"
              value={core.venue}
              onChange={(e) => patchCore({ venue: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Description / source copy</span>
          <textarea
            value={core.description}
            onChange={(e) => patchCore({ description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Source URL</span>
          <input
            type="url"
            value={core.concertUrl}
            onChange={(e) => patchCore({ concertUrl: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">City</span>
            <input
              type="text"
              value={core.city}
              onChange={(e) => patchCore({ city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">State / region</span>
            <input
              type="text"
              value={core.stateUS}
              onChange={(e) => patchCore({ stateUS: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Country</span>
            <input
              type="text"
              value={core.country}
              onChange={(e) => patchCore({ country: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Event start date</span>
            <input
              type="date"
              value={core.eventStartDate}
              onChange={(e) => {
                const v = e.target.value
                patchCore({
                  eventStartDate: v,
                  eventEndDate: !core.eventEndDate || core.eventEndDate < v ? v : core.eventEndDate,
                })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Event start time</span>
            <input
              type="time"
              value={core.eventStartTime}
              onChange={(e) => patchCore({ eventStartTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Event end date</span>
            <input
              type="date"
              value={core.eventEndDate}
              onChange={(e) => patchCore({ eventEndDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Event end time</span>
            <input
              type="time"
              value={core.eventEndTime}
              onChange={(e) => patchCore({ eventEndTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={core.isFestival}
            onChange={(e) => patchCore({ isFestival: e.target.checked })}
            className="rounded border-gray-300"
          />
          Multi-day festival
        </label>
      </div>

      <button
        type="button"
        disabled={!core.concertName.trim()}
        onClick={onContinue}
        className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {continueLabel}
        <span aria-hidden>→</span>
      </button>
    </div>
  )
}

export default function ConcertIngest({ googleApiKey = '' }: { googleApiKey?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [ingestTab, setIngestTab] = useState<IngestTab>('paste')
  const [rawText, setRawText] = useState('')
  const [csvText, setCsvText] = useState('')
  const [manualDraft, setManualDraft] = useState<ConcertIngestDraft>(emptyConcertCore())
  const [draft, setDraft] = useState<ConcertIngestDraft | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')

  if (showWizard && draft) {
    return <ConcertTripWizard initialDraft={draft} googleApiKey={googleApiKey} />
  }

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setParsing(false)
    }
  }

  function handleCsvImport() {
    setError('')
    const result = parseConcertCoreCsv(csvText)
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
      const result = parseConcertCoreCsv(text)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDraft(result.draft)
    }
    reader.onerror = () => setError('Could not read CSV file.')
    reader.readAsText(file)
  }

  function continueToWizard(nextDraft: ConcertIngestDraft) {
    if (!nextDraft.concertName.trim()) {
      setError('Concert name is required.')
      return
    }
    setDraft(coreFromDraft(nextDraft))
    setShowWizard(true)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href={concertsListPath()} className="text-sm text-gray-500 hover:text-gray-800 mb-6 inline-block">
        ← Back to Concerts
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Ingest concert</h1>
      <p className="mt-2 text-sm text-gray-600 max-w-2xl">
        Start with Concert Core — paste and parse, import a core CSV row, or type minimal fields.
        Then continue into the wizard for schedule, trip dates, lodging, and POI.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabBtn('paste', 'Paste / Parse')}
        {tabBtn('csv', 'CSV')}
        {tabBtn('manual', 'Manual')}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
          {error}
        </p>
      ) : null}

      {ingestTab === 'paste' ? (
        <div className="mt-6 rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Paste / Parse</h2>
          <p className="mt-1 text-sm text-gray-600">
            Paste ticket email, festival site copy, or travel notes — AI extracts Concert Core and
            optional trip defaults.
          </p>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={12}
            placeholder="Paste ticket confirmation, lineup page, hotel + show details…"
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
            <CoreReviewCard
              draft={draft}
              onChange={setDraft}
              onContinue={() => continueToWizard(draft)}
            />
          ) : null}
        </div>
      ) : null}

      {ingestTab === 'csv' ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">CSV Core</h2>
          <p className="text-sm text-gray-600">
            Paste or upload a core CSV. The first data row becomes Concert Core — not full
            schedule, trip, or lodging.
          </p>
          <p className="text-xs text-gray-500 font-mono bg-gray-50 border border-gray-100 rounded px-3 py-2 break-all">
            {CONCERT_CORE_CSV_TEMPLATE}
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
            <CoreReviewCard
              draft={draft}
              onChange={setDraft}
              onContinue={() => continueToWizard(draft)}
            />
          ) : null}
        </div>
      ) : null}

      {ingestTab === 'manual' ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Manual Core</h2>
          <p className="mt-1 text-sm text-gray-600">
            Type minimal Concert Core fields. Trip schedule and lodging come next in the wizard.
          </p>
          <CoreReviewCard
            draft={manualDraft}
            onChange={setManualDraft}
            onContinue={() => continueToWizard(manualDraft)}
          />
        </div>
      ) : null}
    </div>
  )
}
