'use client'

import { useState } from 'react'
import {
  COMMON_AIRLINES,
  emptyFlightRow,
  flightRowHasData,
  type TripFlightFormRow,
} from '@/lib/trip-flight'
import { LocalStorageAPI } from '@/lib/localStorage'
import type { TripFlightDirection } from '@prisma/client'

type LogisticItem = {
  id: string
  title: string
  detail?: string | null
  isComplete: boolean
}

type FlightInfoStepProps = {
  tripId: string
  flightRows: TripFlightFormRow[]
  flightNotes: string
  startingLocation: string
  legacyFlightItems: LogisticItem[]
  onChangeFlights: (rows: TripFlightFormRow[]) => void
  onChangeNotes: (notes: string) => void
  onChangeStartingLocation: (value: string) => void
  error: string | null
}

function directionLabel(direction: TripFlightDirection): string {
  if (direction === 'OUTBOUND') return 'Outbound flight'
  if (direction === 'RETURN') return 'Return flight'
  return 'Additional flight'
}

function FlightCard({
  row,
  index,
  onPatch,
  onRemove,
  canRemove,
}: {
  row: TripFlightFormRow
  index: number
  onPatch: (patch: Partial<TripFlightFormRow>) => void
  onRemove?: () => void
  canRemove?: boolean
}) {
  const listId = `airlines-${index}`

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900">{directionLabel(row.direction)}</h4>
        {canRemove && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-gray-500 hover:text-red-600"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block sm:col-span-2">
          <span className="block text-xs font-medium text-gray-600 mb-1">Airline</span>
          <input
            type="text"
            list={listId}
            value={row.airlineName}
            onChange={(e) => {
              const name = e.target.value
              const match = COMMON_AIRLINES.find(
                (a) => a.name.toLowerCase() === name.toLowerCase()
              )
              onPatch({
                airlineName: name,
                airlineCode: match?.code ?? row.airlineCode,
              })
            }}
            placeholder="e.g. American Airlines"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
          <datalist id={listId}>
            {COMMON_AIRLINES.map((airline) => (
              <option key={airline.code} value={airline.name} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Airline code</span>
          <input
            type="text"
            value={row.airlineCode}
            onChange={(e) => onPatch({ airlineCode: e.target.value.toUpperCase() })}
            placeholder="AA"
            maxLength={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Flight number</span>
          <input
            type="text"
            value={row.flightNumber}
            onChange={(e) => onPatch({ flightNumber: e.target.value })}
            placeholder="1234"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Depart airport</span>
          <input
            type="text"
            value={row.departureAirportCode}
            onChange={(e) =>
              onPatch({ departureAirportCode: e.target.value.toUpperCase() })
            }
            placeholder="BOS"
            maxLength={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Arrive airport</span>
          <input
            type="text"
            value={row.arrivalAirportCode}
            onChange={(e) => onPatch({ arrivalAirportCode: e.target.value.toUpperCase() })}
            placeholder="YUL"
            maxLength={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Depart time</span>
          <input
            type="datetime-local"
            value={row.departureTime}
            onChange={(e) => onPatch({ departureTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Arrive time</span>
          <input
            type="datetime-local"
            value={row.arrivalTime}
            onChange={(e) => onPatch({ arrivalTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="block text-xs font-medium text-gray-600 mb-1">Confirmation code</span>
          <input
            type="text"
            value={row.confirmationCode}
            onChange={(e) => onPatch({ confirmationCode: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          />
        </label>
      </div>
    </div>
  )
}

export default function FlightInfoStep({
  tripId,
  flightRows,
  flightNotes,
  startingLocation,
  legacyFlightItems,
  onChangeFlights,
  onChangeNotes,
  onChangeStartingLocation,
  error,
}: FlightInfoStepProps) {
  const [parseTab, setParseTab] = useState<'paste' | 'upload'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [parseBusy, setParseBusy] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parseSuccess, setParseSuccess] = useState<string | null>(null)

  const otherItems = legacyFlightItems.filter(
    (i) =>
      !/^(outbound flight|return flight|travel notes)$/i.test(i.title.trim())
  )

  function patchRow(index: number, patch: Partial<TripFlightFormRow>) {
    onChangeFlights(
      flightRows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  function addFlight() {
    onChangeFlights([...flightRows, emptyFlightRow('OTHER')])
  }

  async function runParse(body: FormData | { text: string }) {
    setParseError(null)
    setParseSuccess(null)
    const travelerId = LocalStorageAPI.getTravelerId()
    if (!travelerId) {
      setParseError('Sign in to parse confirmations.')
      return
    }

    setParseBusy(true)
    try {
      let res: Response
      if (body instanceof FormData) {
        body.set('travelerId', travelerId)
        res = await fetch(`/api/trip/${tripId}/flights/parse`, {
          method: 'POST',
          body,
        })
      } else {
        res = await fetch(`/api/trip/${tripId}/flights/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ travelerId, text: body.text }),
        })
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Parse failed')
      }

      const parsedRows = Array.isArray(data.flights) ? (data.flights as TripFlightFormRow[]) : []
      const withData = parsedRows.filter(flightRowHasData)
      if (!withData.length) {
        throw new Error('No flight details found — try a clearer paste or photo.')
      }

      onChangeFlights(parsedRows)
      if (typeof data.startingLocation === 'string' && data.startingLocation.trim()) {
        onChangeStartingLocation(data.startingLocation.trim())
      }
      setParseSuccess(
        `Parsed ${withData.length} flight leg${withData.length === 1 ? '' : 's'} — review below and edits auto-save.`
      )
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setParseBusy(false)
    }
  }

  async function parsePaste() {
    await runParse({ text: pasteText })
  }

  async function parseUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.set('file', file)
    if (pasteText.trim()) form.set('text', pasteText.trim())
    await runParse(form)
    e.target.value = ''
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Flights</h3>
        <p className="text-sm text-gray-600">
          Where you leave from, structured flight legs, and other travel notes.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Leaving from</span>
        <input
          type="text"
          value={startingLocation}
          onChange={(e) => onChangeStartingLocation(e.target.value)}
          placeholder="Home city or usual departure airport area"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <span className="block text-xs text-gray-500 mt-1">
          Prefilled from your profile when available — helps frame outbound flights.
        </span>
      </label>

      {legacyFlightItems.some((i) =>
        /^(outbound flight|return flight)$/i.test(i.title.trim())
      ) ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Legacy free-text flight notes are still saved on this trip — re-enter details below to
          upgrade to structured flights.
        </p>
      ) : null}

      <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Paste or upload confirmation</h4>
          <p className="text-xs text-gray-600 mt-0.5">
            Expedia email, airline confirmation, or screenshot — we extract flight number, airports,
            and confirmation code for you to review.
          </p>
        </div>

        <div className="flex gap-2 border-b border-sky-100 pb-2">
          <button
            type="button"
            onClick={() => setParseTab('paste')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md ${
              parseTab === 'paste'
                ? 'bg-white text-sky-800 border border-sky-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Paste text
          </button>
          <button
            type="button"
            onClick={() => setParseTab('upload')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md ${
              parseTab === 'upload'
                ? 'bg-white text-sky-800 border border-sky-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Upload photo
          </button>
        </div>

        {parseTab === 'paste' ? (
          <div className="space-y-2">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              placeholder="Paste your Expedia or airline confirmation email…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
            <button
              type="button"
              onClick={() => void parsePaste()}
              disabled={parseBusy || pasteText.trim().length < 10}
              className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              {parseBusy ? 'Parsing…' : 'Parse flights'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void parseUpload(e)}
              disabled={parseBusy}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-white file:text-sky-800 file:font-medium"
            />
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={2}
              placeholder="Optional: add extra text to help the parser"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
            {parseBusy ? <p className="text-xs text-gray-500">Parsing screenshot…</p> : null}
          </div>
        )}

        {parseError ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {parseError}
          </p>
        ) : null}
        {parseSuccess ? (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {parseSuccess}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {flightRows.map((row, index) => (
          <FlightCard
            key={`${row.direction}-${index}-${row.id ?? 'new'}`}
            row={row}
            index={index}
            onPatch={(patch) => patchRow(index, patch)}
            onRemove={
              row.direction === 'OTHER'
                ? () => onChangeFlights(flightRows.filter((_, i) => i !== index))
                : undefined
            }
            canRemove={row.direction === 'OTHER'}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addFlight}
        className="text-sm text-sky-700 font-medium hover:underline"
      >
        + Add flight
      </button>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Other travel notes</span>
        <textarea
          value={flightNotes}
          onChange={(e) => onChangeNotes(e.target.value)}
          rows={3}
          placeholder="Airport transfer, rental car pickup, train, etc."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>

      {otherItems.length > 0 ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Saved logistics
          </p>
          <ul className="space-y-1 text-sm text-gray-700">
            {otherItems.map((item) => (
              <li key={item.id}>
                {item.title}
                {item.detail ? ` — ${item.detail}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
