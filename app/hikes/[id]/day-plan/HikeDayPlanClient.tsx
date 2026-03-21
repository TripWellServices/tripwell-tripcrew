'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import type { DayPlanStep } from '@/lib/hike-day-plan'

function addMinutesToTime(hhmm: string, delta: number): string {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm
  const d = new Date(2000, 0, 1, h, m + delta)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

function formatShareText(
  date: string,
  hikeName: string,
  steps: DayPlanStep[]
): string {
  const lines = [
    `${date} — ${hikeName}`,
    '',
    ...steps.map((s) => {
      const n = s.notes?.trim()
      return `${s.time}  ${s.label}${n ? ` — ${n}` : ''}`
    }),
  ]
  return lines.join('\n')
}

export default function HikeDayPlanClient() {
  const params = useParams() as { id?: string; hikeId?: string }
  const searchParams = useSearchParams()
  /** Crew route: /tripcrews/[id]/hikes/[hikeId]/day-plan — both id (crew) and hikeId set. */
  const isCrewHikeContext = Boolean(params.hikeId)
  const tripCrewId = isCrewHikeContext ? params.id : undefined
  const hikeId = params.hikeId || params.id || ''
  const returnTo = searchParams.get('return') ?? '/'

  const [hikeName, setHikeName] = useState('')
  const [hikeMeta, setHikeMeta] = useState<string>('')
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [date, setDate] = useState(todayISO)
  const [departureTime, setDepartureTime] = useState('08:00')
  const [homeAddress, setHomeAddress] = useState('')
  const [phase, setPhase] = useState<'form' | 'review' | 'share'>('form')
  const [steps, setSteps] = useState<DayPlanStep[]>([])
  const [metaDate, setMetaDate] = useState('')
  const [loadingHike, setLoadingHike] = useState(true)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyOk, setCopyOk] = useState(false)
  const [savedTripId, setSavedTripId] = useState<string | null>(null)
  const [savingTrip, setSavingTrip] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/hikes/${hikeId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load hike')
        if (cancelled) return
        setHikeName(data.name ?? 'Hike')
        const bits = [
          data.trailOrPlace,
          data.distanceMi != null ? `${data.distanceMi} mi` : null,
          data.durationMin != null ? `~${data.durationMin} min` : null,
        ].filter(Boolean)
        setHikeMeta(bits.join(' · '))
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoadingHike(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hikeId])

  useEffect(() => {
    const auth = getFirebaseAuth()
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setTravelerId(null)
        return
      }
      try {
        const res = await fetch('/api/auth/hydrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseId: user.uid,
            email: user.email,
            name: user.displayName,
            picture: user.photoURL,
          }),
        })
        const data = await res.json()
        const t = data.traveler
        if (t?.id) setTravelerId(t.id)
        if (t?.homeAddress && typeof t.homeAddress === 'string') {
          setHomeAddress((prev) => prev || t.homeAddress)
        }
      } catch {
        /* ignore */
      }
    })
  }, [])

  const buildPlan = useCallback(async () => {
    setError(null)
    setBuilding(true)
    try {
      const res = await fetch('/api/hikes/day-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hikeId,
          date,
          departureTime,
          homeAddress: homeAddress.trim(),
          travelerId: travelerId ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to build plan')
      setSteps(data.steps ?? [])
      setMetaDate(data.date ?? date)
      setPhase('review')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBuilding(false)
    }
  }, [hikeId, date, departureTime, homeAddress, travelerId])

  function shiftDeparture(deltaMin: number) {
    setDepartureTime((t) => addMinutesToTime(t, deltaMin))
  }

  async function rebuildAfterShift(deltaMin: number) {
    const next = addMinutesToTime(departureTime, deltaMin)
    setDepartureTime(next)
    setBuilding(true)
    setError(null)
    try {
      const res = await fetch('/api/hikes/day-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hikeId,
          date,
          departureTime: next,
          homeAddress: homeAddress.trim(),
          travelerId: travelerId ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to rebuild')
      setSteps(data.steps ?? [])
      setMetaDate(data.date ?? date)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBuilding(false)
    }
  }

  async function copyShare() {
    const text = formatShareText(metaDate || date, hikeName, steps)
    try {
      await navigator.clipboard.writeText(text)
      setCopyOk(true)
      setTimeout(() => setCopyOk(false), 2000)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  const shareText = formatShareText(metaDate || date, hikeName, steps)

  async function saveAsDayTrip() {
    if (!tripCrewId || !hikeId || !travelerId) return
    setSavingTrip(true)
    setError(null)
    try {
      const start = new Date(`${date}T12:00:00`)
      const end = new Date(start)
      const createRes = await fetch(`/api/tripcrew/${tripCrewId}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createPlanned: true,
          tripName: hikeName || 'Hike day',
          purpose: 'Day trip for this hike',
          travelerId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
      })
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        throw new Error(err.error || 'Could not create trip')
      }
      const created = await createRes.json()
      const tid = created.trip?.id || created.id
      if (!tid) throw new Error('No trip id')

      const itemRes = await fetch(`/api/trip/${tid}/itinerary-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: hikeName || 'Hike',
          type: 'hike',
          hikeId,
          date: start.toISOString(),
        }),
      })
      if (!itemRes.ok) {
        const err = await itemRes.json().catch(() => ({}))
        throw new Error(err.error || 'Could not add hike to trip')
      }
      setSavedTripId(tid)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSavingTrip(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <Link
        href={returnTo}
        className="text-sm text-sky-600 hover:text-sky-800 font-medium mb-6 inline-block"
      >
        ← Back
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Plan your hike day</h1>
      <p className="text-gray-500 text-sm mb-6">{hikeName}</p>
      {hikeMeta && (
        <p className="text-sm text-gray-600 mb-6 -mt-4">{hikeMeta}</p>
      )}

      {loadingHike && <p className="text-sm text-gray-400">Loading hike…</p>}

      {error && (
        <p className="text-sm text-red-600 font-medium mb-4">{error}</p>
      )}

      {phase === 'form' && !loadingHike && (
        <div className="space-y-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Date
            </span>
            <input
              type="date"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Leave home at
            </span>
            <input
              type="time"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Starting location
            </span>
            <input
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Home address (from profile or type here)"
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Save a default in{' '}
              <Link href="/profile/settings" className="text-sky-600 underline">
                Profile settings
              </Link>
              .
            </p>
          </label>
          <button
            type="button"
            onClick={buildPlan}
            disabled={building || !homeAddress.trim()}
            className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40"
          >
            {building ? 'Building…' : 'Build my day'}
          </button>
        </div>
      )}

      {phase === 'review' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <p className="text-sm text-gray-600">
              {metaDate || date} · Leave home{' '}
              <span className="font-semibold text-gray-900">{departureTime}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={building}
                onClick={() => rebuildAfterShift(-30)}
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                Earlier 30m
              </button>
              <button
                type="button"
                disabled={building}
                onClick={() => rebuildAfterShift(30)}
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                Leave later 30m
              </button>
            </div>
          </div>
          {building && (
            <p className="text-sm text-gray-400">Updating plan…</p>
          )}
          <ol className="relative border-l-2 border-emerald-200 ml-3 space-y-4 pl-6 py-2">
            {steps.map((s, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.4rem] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                <p className="text-sm font-semibold text-gray-900">{s.time}</p>
                <p className="text-sm text-gray-800">{s.label}</p>
                {s.notes && (
                  <p className="text-xs text-gray-500 mt-0.5">{s.notes}</p>
                )}
              </li>
            ))}
          </ol>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setPhase('share')}
              className="flex-1 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              I&apos;m good with this
            </button>
            <button
              type="button"
              onClick={() => setPhase('form')}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              Edit inputs
            </button>
          </div>
        </div>
      )}

      {phase === 'share' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900">Share this plan</h2>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 rounded-lg p-4 border border-gray-100">
              {shareText}
            </pre>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={copyShare}
                className="w-full px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
              >
                {copyOk ? 'Copied!' : 'Copy to clipboard'}
              </button>
              {isCrewHikeContext && travelerId && !savedTripId && (
                <button
                  type="button"
                  onClick={saveAsDayTrip}
                  disabled={savingTrip}
                  className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingTrip ? 'Saving…' : 'Save as a day trip'}
                </button>
              )}
              {savedTripId && (
                <Link
                  href={`/trip/${savedTripId}/admin`}
                  className="w-full text-center px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
                >
                  View trip →
                </Link>
              )}
              <button
                type="button"
                onClick={async () => {
                  setPhase('review')
                  await rebuildAfterShift(30)
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-800 hover:bg-gray-50"
              >
                Leave later (+30m)
              </button>
              <button
                type="button"
                onClick={() => setPhase('review')}
                className="w-full px-4 py-2 rounded-lg border border-emerald-200 text-emerald-800 text-sm font-medium hover:bg-emerald-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
