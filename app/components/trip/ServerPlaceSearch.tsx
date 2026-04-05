'use client'

import { useCallback, useState } from 'react'

export type LocationBias = { lat: number; lng: number; radiusMeters?: number }

type Candidate = {
  place_id: string
  name: string
  formatted_address?: string
  rating?: number
}

interface ServerPlaceSearchProps {
  onPlaceSelect: (placeId: string) => void
  placeholder?: string
  helperText?: string
  locationBias?: LocationBias | null
  disabled?: boolean
}

export default function ServerPlaceSearch({
  onPlaceSelect,
  placeholder = 'Search by place name…',
  helperText = 'Results from Google Places (server). Pick a row to add details to this trip.',
  locationBias,
  disabled: externalDisabled,
}: ServerPlaceSearchProps) {
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const search = useCallback(async () => {
    const q = query.trim()
    if (q.length < 2) {
      setErr('Type at least 2 characters')
      return
    }
    setErr(null)
    setBusy(true)
    setCandidates([])
    try {
      const body: { query: string; locationBias?: LocationBias } = { query: q }
      if (
        locationBias &&
        Number.isFinite(locationBias.lat) &&
        Number.isFinite(locationBias.lng)
      ) {
        body.locationBias = locationBias
      }
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Search failed')
        return
      }
      setCandidates(Array.isArray(data.results) ? data.results : [])
    } catch {
      setErr('Search failed')
    } finally {
      setBusy(false)
    }
  }, [query, locationBias])

  const disabled = externalDisabled || busy

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void search()
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={disabled}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {busy ? 'Searching…' : 'Search'}
        </button>
      </div>
      {helperText ? (
        <p className="text-xs text-gray-500">{helperText}</p>
      ) : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {candidates.length > 0 && (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto bg-white">
          {candidates.map((c) => (
            <li key={c.place_id}>
              <button
                type="button"
                onClick={() => {
                  onPlaceSelect(c.place_id)
                  setCandidates([])
                }}
                disabled={disabled}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 disabled:opacity-50"
              >
                <div className="font-medium text-gray-900">{c.name}</div>
                {c.formatted_address ? (
                  <div className="text-xs text-gray-500 mt-0.5">{c.formatted_address}</div>
                ) : null}
                {typeof c.rating === 'number' ? (
                  <div className="text-xs text-amber-600 mt-0.5">★ {c.rating.toFixed(1)}</div>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
