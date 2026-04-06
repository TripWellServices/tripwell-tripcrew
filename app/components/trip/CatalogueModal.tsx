'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

export type CatalogueModalType = 'dining' | 'attraction'

type CatalogueRow = {
  id: string
  title: string
  category?: string | null
  address?: string | null
  googlePlaceId?: string | null
  imageUrl?: string | null
  rating?: number | null
}

interface CatalogueModalProps {
  type: CatalogueModalType
  tripId: string
  cityId: string | null
  /** Dining or attraction IDs already linked to this trip */
  tripItemIds: string[]
  open: boolean
  onClose: () => void
}

export default function CatalogueModal({
  type,
  tripId,
  cityId,
  tripItemIds,
  open,
  onClose,
}: CatalogueModalProps) {
  const router = useRouter()
  const [items, setItems] = useState<CatalogueRow[]>([])
  const [cityLabel, setCityLabel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  const onTrip = useCallback(
    (id: string) => tripItemIds.includes(id),
    [tripItemIds]
  )

  const load = useCallback(async () => {
    if (!cityId) return
    setLoading(true)
    setErr(null)
    try {
      const q = new URLSearchParams({ type, cityId })
      const res = await fetch(`/api/catalogue?${q}`)
      const data = await res.json()
      if (!res.ok) {
        setErr(typeof data.error === 'string' ? data.error : 'Failed to load catalogue')
        setItems([])
        return
      }
      setCityLabel(
        data.city
          ? [data.city.name, data.city.state].filter(Boolean).join(', ')
          : null
      )
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setErr('Failed to load catalogue')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [cityId, type])

  useEffect(() => {
    if (open && cityId) void load()
    if (!open) {
      setItems([])
      setErr(null)
      setCityLabel(null)
    }
  }, [open, cityId, load])

  async function addToTrip(row: CatalogueRow) {
    setAddingId(row.id)
    setErr(null)
    try {
      const hydratePath = type === 'dining' ? '/api/hydrate/dining' : '/api/hydrate/attractions'
      const entityPath = type === 'dining' ? '/api/dining' : '/api/attractions'
      let targetId = row.id

      if (row.googlePlaceId?.trim()) {
        const h = await fetch(hydratePath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId: row.googlePlaceId.trim(), tripId }),
        })
        if (h.ok) {
          const hydrated = await h.json()
          if (hydrated?.id) targetId = hydrated.id
        }
      }

      const patch = await fetch(`${entityPath}/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      })
      if (!patch.ok) {
        const p = await patch.json().catch(() => ({}))
        setErr(typeof p.error === 'string' ? p.error : 'Could not add to trip')
        return
      }
      router.refresh()
      onClose()
    } catch {
      setErr('Could not add to trip')
    } finally {
      setAddingId(null)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalogue-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 id="catalogue-modal-title" className="text-lg font-semibold text-gray-900 capitalize">
              {type} catalogue
            </h2>
            {cityLabel ? (
              <p className="text-sm text-gray-500 mt-0.5">{cityLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Close
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {!cityId ? (
            <p className="text-sm text-gray-600">
              We couldn&apos;t match this trip to a catalogue region yet. Check that the trip
              city matches a city in your database, or add places manually.
            </p>
          ) : loading ? (
            <p className="text-sm text-gray-600">Loading catalogue…</p>
          ) : err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-600">No {type} entries in this region&apos;s catalogue yet.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((row) => {
                const added = onTrip(row.id)
                return (
                  <li
                    key={row.id}
                    className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2 bg-gray-50/50"
                  >
                    {row.imageUrl ? (
                      <img
                        src={row.imageUrl}
                        alt=""
                        className="w-full h-24 object-cover rounded"
                      />
                    ) : null}
                    <div className="font-medium text-gray-900">{row.title}</div>
                    {row.category ? (
                      <div className="text-xs text-gray-500">{row.category}</div>
                    ) : null}
                    {row.address ? (
                      <div className="text-xs text-gray-600 line-clamp-2">{row.address}</div>
                    ) : null}
                    {typeof row.rating === 'number' ? (
                      <div className="text-xs text-amber-700">★ {row.rating.toFixed(1)}</div>
                    ) : null}
                    {added ? (
                      <span className="text-xs font-medium text-green-700">Added to trip</span>
                    ) : (
                      <button
                        type="button"
                        disabled={addingId !== null}
                        onClick={() => void addToTrip(row)}
                        className="mt-auto px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {addingId === row.id ? 'Adding…' : 'Add to trip'}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
