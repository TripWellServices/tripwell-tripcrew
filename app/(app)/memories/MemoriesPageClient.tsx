'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { LocalStorageAPI } from '@/lib/localStorage'
import { uploadTripMemoryPhotoFile } from '@/lib/client/tripMemoryUpload'
import { tripDisplayTitle } from '@/lib/trip/computeTripMetadata'

type MemoryPhoto = { id: string; publicUrl: string; sortOrder: number }

type TripOption = {
  id: string
  tripName?: string
  dateRange?: string
}

type TripMemoryRow = {
  id: string
  tripId: string | null
  authorTravelerId: string
  body: string
  createdAt: string
  freestyleTitle: string | null
  freestyleCity: string | null
  freestyleState: string | null
  freestyleCountry: string | null
  freestyleStartDate: string | null
  freestyleEndDate: string | null
  author: {
    id: string
    firstName: string | null
    lastName: string | null
  }
  photos: MemoryPhoto[]
  tripDay: { id: string; dayNumber: number; date: string } | null
  trip: {
    id: string
    purpose: string
    city: string | null
    state: string | null
    country: string | null
  } | null
}

export default function MemoriesPageClient() {
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [memories, setMemories] = useState<TripMemoryRow[]>([])
  const [trips, setTrips] = useState<TripOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<'standalone' | 'trip'>('standalone')
  const [selectedTripId, setSelectedTripId] = useState('')
  const [freestyleTitle, setFreestyleTitle] = useState('')
  const [freestyleCity, setFreestyleCity] = useState('')
  const [freestyleState, setFreestyleState] = useState('')
  const [freestyleCountry, setFreestyleCountry] = useState('')
  const [freestyleStart, setFreestyleStart] = useState('')
  const [freestyleEnd, setFreestyleEnd] = useState('')

  const [newBody, setNewBody] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [creating, setCreating] = useState(false)

  const [shareExtra, setShareExtra] = useState('')
  const [sharingId, setSharingId] = useState<string | null>(null)
  const [attachTripId, setAttachTripId] = useState<Record<string, string>>({})

  const loadMemories = useCallback(async (tid: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/traveler/memories?travelerId=${encodeURIComponent(tid)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not load memories')
        setMemories([])
        return
      }
      setMemories(data.memories ?? [])
    } catch {
      setError('Could not load memories')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTrips = useCallback(async (tid: string) => {
    try {
      const res = await fetch(
        `/api/traveler/trips?travelerId=${encodeURIComponent(tid)}&scope=all`
      )
      const data = await res.json().catch(() => [])
      if (res.ok && Array.isArray(data)) {
        setTrips(
          data.map((t: TripOption & { purpose?: string; startDate?: string }) => ({
            id: t.id,
            tripName: t.tripName || tripDisplayTitle(t.purpose),
            dateRange: t.dateRange,
          }))
        )
      }
    } catch {
      setTrips([])
    }
  }, [])

  useEffect(() => {
    const tid = LocalStorageAPI.getTravelerId()
    setTravelerId(tid)
    if (tid) {
      void loadMemories(tid)
      void loadTrips(tid)
    } else setLoading(false)
  }, [loadMemories, loadTrips])

  const authorLabel = (m: TripMemoryRow) => {
    const n = [m.author.firstName, m.author.lastName].filter(Boolean).join(' ').trim()
    return n || 'You'
  }

  const memoryContextLine = (m: TripMemoryRow) => {
    if (m.trip) {
      const place = [m.trip.city, m.trip.state, m.trip.country].filter(Boolean).join(', ')
      return place || tripDisplayTitle(m.trip.purpose) || 'TripWell trip'
    }
    const place = [m.freestyleCity, m.freestyleState, m.freestyleCountry].filter(Boolean).join(', ')
    return [m.freestyleTitle, place].filter(Boolean).join(' · ') || 'Memory'
  }

  const handleCreate = async () => {
    const tid = LocalStorageAPI.getTravelerId()
    if (!tid) {
      setError('Sign in first — we need your traveler id.')
      return
    }
    const fileArr = files ? Array.from(files) : []
    if (!newBody.trim() && fileArr.length === 0) {
      setError('Write something or add at least one photo.')
      return
    }
    if (mode === 'trip' && !selectedTripId) {
      setError('Choose a trip, or switch to “Hindsight / freestyle”.')
      return
    }
    if (mode === 'standalone' && !freestyleTitle.trim()) {
      setError('Add a short title for this memory (e.g. “Weekend in Lisbon”).')
      return
    }

    setCreating(true)
    setError(null)
    try {
      const payload =
        mode === 'trip'
          ? {
              travelerId: tid,
              body: newBody.trim(),
              tripId: selectedTripId,
            }
          : {
              travelerId: tid,
              body: newBody.trim(),
              freestyleTitle: freestyleTitle.trim(),
              freestyleCity: freestyleCity.trim() || undefined,
              freestyleState: freestyleState.trim() || undefined,
              freestyleCountry: freestyleCountry.trim() || undefined,
              freestyleStartDate: freestyleStart || undefined,
              freestyleEndDate: freestyleEnd || undefined,
            }

      const res = await fetch('/api/traveler/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const created = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof created.error === 'string' ? created.error : 'Could not create memory')
        return
      }

      const memoryId = created.id as string

      for (const file of fileArr) {
        const { storagePath, publicUrl, byteLength, contentType } =
          await uploadTripMemoryPhotoFile(memoryId, file)
        const pr = await fetch(`/api/traveler/memories/${memoryId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            travelerId: tid,
            storagePath,
            publicUrl,
            contentType,
            byteLength,
          }),
        })
        const pj = await pr.json().catch(() => ({}))
        if (!pr.ok) {
          setError(typeof pj.error === 'string' ? pj.error : 'Photo upload issue')
          break
        }
      }

      setNewBody('')
      setFiles(null)
      setFreestyleTitle('')
      setFreestyleCity('')
      setFreestyleState('')
      setFreestyleCountry('')
      setFreestyleStart('')
      setFreestyleEnd('')
      await loadMemories(tid)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (memoryId: string) => {
    const tid = LocalStorageAPI.getTravelerId()
    if (!tid || !confirm('Delete this memory?')) return
    const res = await fetch(
      `/api/traveler/memories/${memoryId}?travelerId=${encodeURIComponent(tid)}`,
      { method: 'DELETE' }
    )
    if (res.ok) await loadMemories(tid)
    else {
      const d = await res.json().catch(() => ({}))
      setError(typeof d.error === 'string' ? d.error : 'Delete failed')
    }
  }

  const handleShare = async (memoryId: string) => {
    const tid = LocalStorageAPI.getTravelerId()
    if (!tid) return
    setSharingId(memoryId)
    setError(null)
    try {
      const extra = shareExtra
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
      const res = await fetch(`/api/traveler/memories/${memoryId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelerId: tid,
          recipientEmails: extra.length ? extra : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Share failed')
        return
      }
      const results = data.results as { email: string; ok: boolean }[]
      alert(`Sent: ${results.filter((r) => r.ok).length} of ${results.length}`)
    } finally {
      setSharingId(null)
    }
  }

  const handleAttachTrip = async (memoryId: string) => {
    const tid = LocalStorageAPI.getTravelerId()
    const tripId = attachTripId[memoryId]?.trim()
    if (!tid || !tripId) return
    const res = await fetch(`/api/traveler/memories/${memoryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ travelerId: tid, tripId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Could not link trip')
      return
    }
    await loadMemories(tid)
  }

  if (!travelerId && !loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Memories</h1>
        <p className="mt-3 text-gray-600">
          Sign in to capture reflections and photos — with or without a TripWell trip.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Memories</h1>
        <p className="mt-2 text-gray-600 text-sm leading-relaxed">
          Add memories from scratch (hindsight trips) or tie them to a trip you planned in TripWell.
          Photos live in your library either way; you can link a standalone memory to a trip anytime.
        </p>
      </header>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-medium text-gray-900">New memory</h2>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="memMode"
              checked={mode === 'standalone'}
              onChange={() => setMode('standalone')}
            />
            Hindsight / freestyle
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="memMode"
              checked={mode === 'trip'}
              onChange={() => setMode('trip')}
            />
            Linked to a TripWell trip
          </label>
        </div>

        {mode === 'trip' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700">Trip</label>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select…</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tripName || 'Trip'}
                  {t.dateRange ? ` — ${t.dateRange}` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                value={freestyleTitle}
                onChange={(e) => setFreestyleTitle(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input
                value={freestyleCity}
                onChange={(e) => setFreestyleCity(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">State / region</label>
              <input
                value={freestyleState}
                onChange={(e) => setFreestyleState(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Country</label>
              <input
                value={freestyleCountry}
                onChange={(e) => setFreestyleCountry(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Approx. start</label>
              <input
                type="date"
                value={freestyleStart}
                onChange={(e) => setFreestyleStart(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Approx. end</label>
              <input
                type="date"
                value={freestyleEnd}
                onChange={(e) => setFreestyleEnd(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Reflection</label>
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Photos</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="mt-1 block w-full text-sm text-gray-600"
            onChange={(e) => setFiles(e.target.files)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Extra email recipients (optional)
          </label>
          <input
            type="text"
            value={shareExtra}
            onChange={(e) => setShareExtra(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Comma-separated. Merged with TripCrew when you share a linked memory. Required for
            freestyle-only shares.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {creating ? 'Saving…' : 'Save memory'}
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Your memories</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : memories.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing here yet.</p>
        ) : (
          memories.map((m) => (
            <article
              key={m.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">{authorLabel(m)}</span>
                <time className="text-xs text-gray-500">
                  {format(new Date(m.createdAt), 'MMM d, yyyy · h:mm a')}
                </time>
              </div>
              <p className="text-sm text-sky-900 font-medium">{memoryContextLine(m)}</p>
              {m.tripId && (
                <Link
                  href={`/trip/${m.tripId}`}
                  className="text-xs text-sky-600 hover:text-sky-800 font-medium"
                >
                  Open trip →
                </Link>
              )}
              {!m.tripId && trips.length > 0 && (
                <div className="flex flex-wrap items-end gap-2 pt-1">
                  <div>
                    <label className="block text-xs text-gray-500">Link to trip</label>
                    <select
                      value={attachTripId[m.id] ?? ''}
                      onChange={(e) =>
                        setAttachTripId((s) => ({ ...s, [m.id]: e.target.value }))
                      }
                      className="mt-0.5 rounded-md border border-gray-300 px-2 py-1 text-xs"
                    >
                      <option value="">Select trip…</option>
                      {trips.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.tripName || t.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAttachTrip(m.id)}
                    disabled={!attachTripId[m.id]}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Attach
                  </button>
                </div>
              )}
              {m.tripDay && (
                <p className="text-xs text-gray-500">Day {m.tripDay.dayNumber}</p>
              )}
              {m.body.trim() ? (
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{m.body}</p>
              ) : (
                <p className="text-sm italic text-gray-500">Photos only</p>
              )}
              {m.photos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {m.photos.map((p) => (
                    <a key={p.id} href={p.publicUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.publicUrl}
                        alt=""
                        className="h-24 w-24 rounded-md object-cover ring-1 ring-gray-200"
                      />
                    </a>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => void handleShare(m.id)}
                  disabled={sharingId === m.id}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  {sharingId === m.id ? 'Sending…' : 'Share by email'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(m.id)}
                  className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
