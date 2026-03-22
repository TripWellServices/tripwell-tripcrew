'use client'

import { useEffect, useState } from 'react'

interface Crew {
  id: string
  name: string | null
}

export default function SendToTripCrew({
  tripId,
  currentCrewId,
  currentCrewName,
}: {
  tripId: string
  currentCrewId: string | null
  currentCrewName: string | null
}) {
  const [crews, setCrews] = useState<Crew[]>([])
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string>(currentCrewId ?? '')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const tid = typeof window !== 'undefined' ? localStorage.getItem('travelerId') : null
    setTravelerId(tid)
    if (!tid) {
      setLoading(false)
      return
    }
    fetch(`/api/tripcrew?travelerId=${encodeURIComponent(tid)}`)
      .then((r) => r.json())
      .then((data) => setCrews(data.tripCrews || []))
      .catch(() => setCrews([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setMessage(null)
    setError(null)
    if (!travelerId) {
      setError('Sign in required.')
      return
    }
    const crewId = selected.trim() === '' ? null : selected.trim()
    setSaving(true)
    try {
      const res = await fetch(`/api/trip/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travelerId, crewId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not update trip')
        return
      }
      setMessage(crewId ? 'Trip linked to crew.' : 'Trip is personal again.')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Send to TripCrew</h2>
      <p className="text-sm text-gray-600 mb-4">
        Link this trip to a crew so it appears on the crew page. You can clear the selection to keep it
        personal.
      </p>
      {currentCrewName && (
        <p className="text-xs text-sky-700 mb-2">
          Currently: <span className="font-medium">{currentCrewName}</span>
        </p>
      )}
      {loading ? (
        <p className="text-sm text-gray-500">Loading crews…</p>
      ) : !travelerId ? (
        <p className="text-sm text-gray-500">Sign in to manage crew assignment.</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex-1 block">
            <span className="block text-xs font-medium text-gray-600 mb-1">TripCrew</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Personal (no crew)</option>
              {crews.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || 'Unnamed crew'}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
      {message && <p className="mt-2 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
