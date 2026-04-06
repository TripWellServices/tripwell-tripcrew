'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export type AddEntryType = 'dining' | 'attraction'

interface AddEntryModalProps {
  type: AddEntryType
  tripId: string
  open: boolean
  onClose: () => void
  /** When resolved, new manual entries can be tagged to the city catalogue. */
  catalogueCityId?: string | null
}

export default function AddEntryModal({
  type,
  tripId,
  open,
  onClose,
  catalogueCityId,
}: AddEntryModalProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'manual' | 'paste'>('manual')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setTab('manual')
      setTitle('')
      setCategory('')
      setNotes('')
      setPasteText('')
      setErr(null)
      setBusy(false)
    }
  }, [open])

  if (!open) return null

  const entityLabel = type === 'dining' ? 'restaurant' : 'attraction'
  const apiPath = type === 'dining' ? '/api/dining' : '/api/attractions'

  async function save() {
    setErr(null)
    const t = title.trim()
    if (!t) {
      setErr('Name is required')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          title: t,
          category: category.trim() || null,
          description: notes.trim() || null,
          ...(catalogueCityId ? { cityId: catalogueCityId } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(typeof data.error === 'string' ? data.error : 'Could not save')
        return
      }
      onClose()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function runPasteParse() {
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch('/api/experience/parse-paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText, type }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(typeof data.error === 'string' ? data.error : 'Parse failed')
        return
      }
      if (typeof data.title === 'string') setTitle(data.title)
      if (data.category != null) setCategory(String(data.category))
      if (data.description != null) setNotes(String(data.description))
      setTab('manual')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-entry-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 id="add-entry-title" className="text-lg font-semibold text-gray-900 capitalize">
            Add {entityLabel}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Close
          </button>
        </div>

        <div className="px-5 pt-3 flex gap-2 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px ${
              tab === 'manual'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => setTab('paste')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px ${
              tab === 'paste'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            AI paste
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {err ? <p className="text-sm text-red-600">{err}</p> : null}

          {tab === 'paste' ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Paste notes, a review, or a blurb about the {entityLabel}
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => void runPasteParse()}
                disabled={busy || pasteText.trim().length < 10}
                className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {busy ? 'Parsing…' : 'Extract fields'}
              </button>
              <p className="text-xs text-gray-500">
                After extraction, review the fields in the Manual tab and save.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? 'Saving…' : `Save to trip`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
