'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { LocalStorageAPI } from '@/lib/localStorage'
import { uploadTripMemoryPhotoFile } from '@/lib/client/tripMemoryUpload'

type MemoryPhoto = {
  id: string
  publicUrl: string
  sortOrder: number
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

interface TripMemoriesCardProps {
  tripId: string
  isAdmin: boolean
}

export default function TripMemoriesCard({ tripId, isAdmin }: TripMemoriesCardProps) {
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [memories, setMemories] = useState<TripMemoryRow[]>([])
  const [suggestedRecipientEmails, setSuggestedRecipientEmails] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newBody, setNewBody] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [creating, setCreating] = useState(false)

  const [shareExtra, setShareExtra] = useState('')
  const [sharingId, setSharingId] = useState<string | null>(null)

  const load = useCallback(async (tid: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/trip/${tripId}/memories?travelerId=${encodeURIComponent(tid)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not load memories')
        setMemories([])
        setSuggestedRecipientEmails([])
        return
      }
      setMemories(data.memories ?? [])
      setSuggestedRecipientEmails(data.suggestedRecipientEmails ?? [])
    } catch {
      setError('Could not load memories')
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    const tid = LocalStorageAPI.getTravelerId()
    setTravelerId(tid)
    if (tid) void load(tid)
    else setLoading(false)
  }, [load])

  const authorLabel = (m: TripMemoryRow) => {
    const n = [m.author.firstName, m.author.lastName].filter(Boolean).join(' ').trim()
    return n || 'Traveler'
  }

  const handleCreate = async () => {
    const tid = LocalStorageAPI.getTravelerId()
    if (!tid) {
      setError('Sign in and complete profile setup so we know your traveler id.')
      return
    }
    const fileArr = files ? Array.from(files) : []
    if (!newBody.trim() && fileArr.length === 0) {
      setError('Write a reflection or choose at least one photo.')
      return
    }

    setCreating(true)
    setError(null)
    try {
      const res = await fetch(`/api/trip/${tripId}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelerId: tid,
          body: newBody.trim(),
        }),
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
        const pr = await fetch(`/api/trip/${tripId}/memories/${memoryId}/photos`, {
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
          setError(typeof pj.error === 'string' ? pj.error : 'Photo saved partially; check memory')
          break
        }
      }

      setNewBody('')
      setFiles(null)
      await load(tid)
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
      `/api/trip/${tripId}/memories/${memoryId}?travelerId=${encodeURIComponent(tid)}`,
      { method: 'DELETE' }
    )
    if (res.ok) await load(tid)
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
      const res = await fetch(`/api/trip/${tripId}/memories/${memoryId}/share`, {
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
      alert(
        `Sent: ${(data.results as { email: string; ok: boolean }[]).filter((r) => r.ok).length} of ${(data.results as { email: string; ok: boolean }[]).length}`
      )
    } finally {
      setSharingId(null)
    }
  }

  if (!travelerId && !loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Trip memories</h2>
        <p className="mt-2 text-sm text-gray-600">
          Sign in and open this trip again to add reflections and photos.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Trip memories</h2>
      <p className="mt-1 text-sm text-gray-600">
        Reflections and photos. Share with your crew by email (links only, no attachments).
      </p>

      {suggestedRecipientEmails.length > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Crew emails we&apos;ll include when you share:{' '}
          <span className="font-medium text-gray-700">{suggestedRecipientEmails.join(', ')}</span>
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {isAdmin && (
        <div className="mt-4 space-y-3 rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-4">
          <label className="block text-sm font-medium text-gray-700">New reflection</label>
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700">Photos (JPEG, PNG, WebP)</label>
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
              Extra recipients (optional)
            </label>
            <input
              type="text"
              value={shareExtra}
              onChange={(e) => setShareExtra(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Comma-separated emails, used when you click Share on a memory below (merged with crew
              list).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Saving…' : 'Save memory'}
          </button>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading memories…</p>
        ) : memories.length === 0 ? (
          <p className="text-sm text-gray-500">No memories yet.</p>
        ) : (
          memories.map((m) => (
            <article
              key={m.id}
              className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{authorLabel(m)}</p>
                <time className="text-xs text-gray-500">
                  {format(new Date(m.createdAt), 'MMM d, yyyy · h:mm a')}
                </time>
              </div>
              {(m.trip || m.freestyleTitle) && (
                <p className="mt-1 text-xs font-medium text-sky-800">
                  {m.trip
                    ? [m.trip.city, m.trip.state, m.trip.country].filter(Boolean).join(', ') ||
                      m.trip.purpose ||
                      'Trip'
                    : [m.freestyleTitle, [m.freestyleCity, m.freestyleState, m.freestyleCountry].filter(Boolean).join(', ')]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
              )}
              {m.tripDay && (
                <p className="mt-1 text-xs text-gray-500">Day {m.tripDay.dayNumber}</p>
              )}
              {m.body.trim() ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{m.body}</p>
              ) : (
                <p className="mt-2 text-sm italic text-gray-500">Photos only</p>
              )}
              {m.photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.photos.map((p) => (
                    <a
                      key={p.id}
                      href={p.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
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
              {travelerId === m.authorTravelerId && (
                <div className="mt-3 flex flex-wrap gap-2">
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
              )}
            </article>
          ))
        )}
      </div>
    </div>
  )
}
