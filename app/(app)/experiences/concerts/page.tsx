'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { LocalStorageAPI } from '@/lib/localStorage'
import { onAuthStateChanged } from 'firebase/auth'
import { concertsIngestPath } from '@/lib/experience-routes'

type ConcertRow = {
  id: string
  name: string
  artist: string | null
  venue: string | null
  eventStartDate: string | null
  eventDate: string | null
  isFestival: boolean
  city?: { name: string } | null
}

function formatConcertDate(c: ConcertRow): string | null {
  const raw = c.eventStartDate || c.eventDate
  if (!raw) return null
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

export default function ConcertsListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [concerts, setConcerts] = useState<ConcertRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/')
        return
      }
      const tid = LocalStorageAPI.getTravelerId()
      if (tid) void loadConcerts(tid)
      else setLoading(false)
    })
    return () => unsub()
  }, [router])

  async function loadConcerts(travelerId: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/concerts?travelerId=${encodeURIComponent(travelerId)}`
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load concerts')
      const rows = Array.isArray(data.concerts) ? data.concerts : Array.isArray(data) ? data : []
      setConcerts(rows)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load concerts')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Concerts</h1>
          <p className="text-gray-500 text-sm mt-1">
            Your saved concerts — ingest a new one to build a trip around it.
          </p>
        </div>
        <Link
          href={concertsIngestPath()}
          className="inline-flex px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700"
        >
          + Add concert trip
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {error}
        </p>
      ) : null}

      {concerts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-600 mb-4">No concerts yet.</p>
          <Link href={concertsIngestPath()} className="text-sky-600 font-medium hover:underline">
            Ingest your first concert trip
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {concerts.map((c) => {
            const dateLabel = formatConcertDate(c)
            return (
              <li
                key={c.id}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">{c.name}</h2>
                    {c.artist ? (
                      <p className="text-sm text-gray-600 mt-0.5">{c.artist}</p>
                    ) : null}
                    <p className="text-xs text-gray-500 mt-1">
                      {[c.venue, c.city?.name].filter(Boolean).join(' · ')}
                      {c.isFestival ? ' · Festival' : ''}
                      {dateLabel ? ` · ${dateLabel}` : ''}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
