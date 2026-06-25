'use client'

import {
  COMMON_AIRLINES,
  emptyFlightRow,
  flightRowHasData,
  type TripFlightFormRow,
} from '@/lib/trip-flight'
import type { TripFlightDirection } from '@prisma/client'

type LogisticItem = {
  id: string
  title: string
  detail?: string | null
  isComplete: boolean
}

type FlightInfoStepProps = {
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
  flightRows,
  flightNotes,
  startingLocation,
  legacyFlightItems,
  onChangeFlights,
  onChangeNotes,
  onChangeStartingLocation,
  error,
}: FlightInfoStepProps) {
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
