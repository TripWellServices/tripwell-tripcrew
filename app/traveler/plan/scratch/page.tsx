'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { experiencePaths } from '@/lib/experience-routes'
import { LocalStorageAPI } from '@/lib/localStorage'

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
  const searchParams = useSearchParams()
  const promote = searchParams.get('promoteToCrewId')
  const paths = experiencePaths(null)
  const q = promote ? `?promoteToCrewId=${encodeURIComponent(promote)}` : ''

  const [tripName, setTripName] = useState('')
  const [where, setWhere] = useState('')
  const [startDate, setStartDate] = useState(todayISO)
  const [endDate, setEndDate] = useState(weekAheadISO)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      const purpose = where.trim()
        ? `Where: ${where.trim()}.`
        : 'Trip created with your details.'
      const res = await fetch('/api/traveler/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createPlanned: true,
          tripName: tripName.trim(),
          purpose,
          travelerId: tid,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
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

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link
        href={`${paths.planFork}${q}`}
        className="text-sm text-sky-600 hover:underline font-medium mb-6 inline-block"
      >
        ← Planner
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter trip details</h1>
      <p className="text-gray-600 text-sm mb-8">
        Create a trip with a name, optional place, and dates — no AI suggestions.
      </p>

      {error ? (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {error}
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
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Where (optional)</span>
          <input
            type="text"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="e.g. Naples, Italy"
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

export default function TravelerPlanScratchPage() {
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
