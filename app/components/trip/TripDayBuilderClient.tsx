'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type {
  SavedTripListItem,
  TripDayRow,
  TripExperienceRow,
} from '@/app/components/trip/TripExperienceCard'
import AddEntryModal, { type AddEntryType } from '@/app/components/trip/AddEntryModal'

type ScheduleDraft = {
  itemKey: string
  startTime: string
  endTime: string
  notes: string
}

type EditDraft = {
  startTime: string
  endTime: string
  notes: string
}

interface TripDayBuilderClientProps {
  tripId: string
  day: TripDayRow
  savedItems: SavedTripListItem[]
  backHref: string
  catalogueCityId?: string | null
  destinationLabel?: string | null
  locationBias?: {
    lat: number
    lng: number
    radiusMeters?: number
  } | null
}

function dateForApi(day: TripDayRow): string {
  const d = new Date(day.date)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dayOfMonth = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dayOfMonth}`
}

function dateForDisplay(day: TripDayRow): Date {
  const d = new Date(day.date)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function experienceTitle(exp: TripExperienceRow): string {
  return (
    exp.dining?.title ??
    exp.attraction?.title ??
    exp.hike?.name ??
    exp.concert?.name ??
    exp.sport?.name ??
    exp.adventure?.name ??
    exp.cruise?.name ??
    exp.notes?.trim() ??
    'Itinerary item'
  )
}

function experienceSub(exp: TripExperienceRow): string | null {
  return (
    exp.dining?.category ??
    exp.attraction?.category ??
    exp.concert?.venue ??
    exp.sport?.venue ??
    exp.hike?.trailOrPlace ??
    null
  )
}

function savedItemKeyFromExperience(exp: TripExperienceRow): string | null {
  if (exp.dining?.id) return `dining:${exp.dining.id}`
  if (exp.attraction?.id) return `attraction:${exp.attraction.id}`
  if (exp.adventure?.id) return `adventure:${exp.adventure.id}`
  if (exp.concert?.id) return `concert:${exp.concert.id}`
  return null
}

export default function TripDayBuilderClient({
  tripId,
  day,
  savedItems,
  backHref,
  catalogueCityId,
  destinationLabel,
  locationBias,
}: TripDayBuilderClientProps) {
  const router = useRouter()
  const [experiences, setExperiences] = useState(
    [...(day.experiences ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
  )
  const [scheduledSavedItemKeys, setScheduledSavedItemKeys] = useState<Set<string>>(
    () =>
      new Set(
        (day.experiences ?? [])
          .map(savedItemKeyFromExperience)
          .filter((key): key is string => Boolean(key))
      )
  )
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft | null>(null)
  const [extraSavedItems, setExtraSavedItems] = useState<SavedTripListItem[]>([])
  const [addModalType, setAddModalType] = useState<AddEntryType | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft>({
    startTime: '',
    endTime: '',
    notes: '',
  })
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savingEditId, setSavingEditId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const allSavedItems = [...extraSavedItems, ...savedItems]
  const visibleSavedItems = allSavedItems.filter(
    (item) => !scheduledSavedItemKeys.has(`${item.kind}:${item.id}`)
  )

  const handleDayAwareSavedItem = (item: { type: AddEntryType; id: string; title: string }) => {
    if (!item.id) {
      setMessage(`${item.title} was saved. Refresh if it does not appear here.`)
      return
    }
    const kind = item.type
    const itemKey = `${kind}:${item.id}`
    const savedItem: SavedTripListItem = {
      kind,
      id: item.id,
      title: item.title,
      category: kind === 'dining' ? 'Restaurant' : 'Place',
    }
    setExtraSavedItems((prev) =>
      prev.some((existing) => `${existing.kind}:${existing.id}` === itemKey)
        ? prev
        : [savedItem, ...prev]
    )
    setScheduleDraft({
      itemKey,
      startTime: '',
      endTime: '',
      notes: '',
    })
    setMessage(`${item.title} was saved. Set a time to add it to Day ${day.dayNumber}.`)
  }

  const beginEdit = (exp: TripExperienceRow) => {
    setEditingId(exp.id)
    setEditDraft({
      startTime: exp.startTime ?? '',
      endTime: exp.endTime ?? '',
      notes: exp.notes ?? '',
    })
  }

  const handleSchedule = async (item: SavedTripListItem, draft: ScheduleDraft) => {
    const itemKey = `${item.kind}:${item.id}`
    setSavingKey(itemKey)
    setError(null)
    setMessage(null)
    try {
      const body: Record<string, string> = { date: dateForApi(day) }
      if (item.kind === 'dining') body.diningId = item.id
      if (item.kind === 'attraction') body.attractionId = item.id
      if (item.kind === 'adventure') body.adventureId = item.id
      if (item.kind === 'concert') body.concertId = item.id
      if (draft.startTime.trim()) body.startTime = draft.startTime.trim()
      if (draft.endTime.trim()) body.endTime = draft.endTime.trim()
      if (draft.notes.trim()) body.notes = draft.notes.trim()

      const res = await fetch(`/api/trip/${tripId}/itinerary-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not create itinerary item')
        return
      }

      setExperiences((prev) =>
        [...prev, data as TripExperienceRow].sort((a, b) => a.orderIndex - b.orderIndex)
      )
      setScheduledSavedItemKeys((prev) => {
        const next = new Set(prev)
        next.add(itemKey)
        return next
      })
      setScheduleDraft(null)
      setMessage(`${item.title} is now in Day ${day.dayNumber}.`)
      router.refresh()
    } finally {
      setSavingKey(null)
    }
  }

  const handleSaveEdit = async (experienceId: string) => {
    setSavingEditId(experienceId)
    setError(null)
    try {
      const res = await fetch(`/api/trip/${tripId}/itinerary-items/${experienceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: editDraft.startTime.trim() || null,
          endTime: editDraft.endTime.trim() || null,
          notes: editDraft.notes.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not update itinerary item')
        return
      }
      setExperiences((prev) =>
        prev.map((exp) => (exp.id === experienceId ? (data as TripExperienceRow) : exp))
      )
      setEditingId(null)
      setMessage('Updated time and notes.')
      router.refresh()
    } finally {
      setSavingEditId(null)
    }
  }

  const handleRemove = async (experienceId: string) => {
    if (!confirm('Remove this item from the day?')) return
    const res = await fetch(`/api/trip/${tripId}/itinerary-items/${experienceId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      setError('Could not remove itinerary item')
      return
    }
    const removed = experiences.find((exp) => exp.id === experienceId)
    const removedKey = removed ? savedItemKeyFromExperience(removed) : null
    setExperiences((prev) => prev.filter((exp) => exp.id !== experienceId))
    if (removedKey) {
      setScheduledSavedItemKeys((prev) => {
        const next = new Set(prev)
        next.delete(removedKey)
        return next
      })
    }
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <Link href={backHref} className="text-sm font-medium text-sky-700 hover:underline">
          ← Back to itinerary
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          Day {day.dayNumber}: {format(dateForDisplay(day), 'EEEE, MMM d')}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Build this day from your global saved restaurants and places.
        </p>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Timed itinerary</h2>
          {experiences.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
              Nothing is locked into this day yet. Pick a saved place from the sidebar.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {experiences.map((exp) => {
                const timeLine = [exp.startTime, exp.endTime].filter(Boolean).join(' - ')
                return (
                  <article key={exp.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{experienceTitle(exp)}</h3>
                        {experienceSub(exp) ? (
                          <p className="text-sm text-gray-600">{experienceSub(exp)}</p>
                        ) : null}
                        {timeLine ? (
                          <p className="mt-1 text-sm font-medium text-sky-800">{timeLine}</p>
                        ) : (
                          <p className="mt-1 text-sm text-amber-700">No time set</p>
                        )}
                        {exp.notes?.trim() ? (
                          <p className="mt-1 text-sm text-gray-600">{exp.notes.trim()}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 text-right">
                        <button
                          type="button"
                          onClick={() => beginEdit(exp)}
                          className="text-sm font-medium text-sky-700 hover:underline"
                        >
                          Edit time
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemove(exp.id)}
                          className="text-sm font-medium text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {editingId === exp.id ? (
                      <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50/70 p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-xs font-medium text-gray-600">
                            Start time
                            <input
                              type="time"
                              value={editDraft.startTime}
                              onChange={(e) =>
                                setEditDraft((prev) => ({ ...prev, startTime: e.target.value }))
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                            />
                          </label>
                          <label className="block text-xs font-medium text-gray-600">
                            End time
                            <input
                              type="time"
                              value={editDraft.endTime}
                              onChange={(e) =>
                                setEditDraft((prev) => ({ ...prev, endTime: e.target.value }))
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                            />
                          </label>
                        </div>
                        <label className="mt-3 block text-xs font-medium text-gray-600">
                          Notes
                          <textarea
                            value={editDraft.notes}
                            onChange={(e) =>
                              setEditDraft((prev) => ({ ...prev, notes: e.target.value }))
                            }
                            rows={2}
                            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSaveEdit(exp.id)}
                            disabled={savingEditId === exp.id}
                            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            {savingEditId === exp.id ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-sky-100 bg-sky-50/70 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-sky-950">Saved globally</h2>
          <p className="mt-1 text-sm text-sky-800">Pick from restaurants and places already saved to this trip.</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <button
              type="button"
              onClick={() => setAddModalType('dining')}
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Add restaurant for Day {day.dayNumber}
            </button>
            <button
              type="button"
              onClick={() => setAddModalType('attraction')}
              className="rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50"
            >
              Add place for Day {day.dayNumber}
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {visibleSavedItems.length === 0 ? (
              <div className="rounded-lg bg-white p-4 text-sm text-gray-600">
                <p>No unscheduled saved places left for this day.</p>
                <Link
                  href={`/trip/${tripId}`}
                  className="mt-3 inline-flex rounded-md border border-sky-200 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-50"
                >
                  Add more saved places
                </Link>
              </div>
            ) : (
              visibleSavedItems.map((item) => {
                const itemKey = `${item.kind}:${item.id}`
                const draftActive = scheduleDraft?.itemKey === itemKey
                return (
                  <div key={itemKey} className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        {item.category ? (
                          <p className="text-sm text-gray-600">{item.category}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setScheduleDraft({
                            itemKey,
                            startTime: '',
                            endTime: '',
                            notes: '',
                          })
                        }
                        className="shrink-0 rounded-md border border-sky-200 px-2.5 py-1 text-sm font-medium text-sky-800 hover:bg-sky-50"
                      >
                        Set time
                      </button>
                    </div>
                    {draftActive ? (
                      <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/70 p-3">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                          <label className="block text-xs font-medium text-gray-600">
                            Start time
                            <input
                              type="time"
                              value={scheduleDraft.startTime}
                              onChange={(e) =>
                                setScheduleDraft((prev) =>
                                  prev ? { ...prev, startTime: e.target.value } : prev
                                )
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                            />
                          </label>
                          <label className="block text-xs font-medium text-gray-600">
                            End time
                            <input
                              type="time"
                              value={scheduleDraft.endTime}
                              onChange={(e) =>
                                setScheduleDraft((prev) =>
                                  prev ? { ...prev, endTime: e.target.value } : prev
                                )
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                            />
                          </label>
                        </div>
                        <label className="mt-3 block text-xs font-medium text-gray-600">
                          Notes
                          <textarea
                            value={scheduleDraft.notes}
                            onChange={(e) =>
                              setScheduleDraft((prev) =>
                                prev ? { ...prev, notes: e.target.value } : prev
                              )
                            }
                            rows={2}
                            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={savingKey === itemKey}
                            onClick={() => void handleSchedule(item, scheduleDraft)}
                            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            {savingKey === itemKey ? 'Adding...' : `Add to Day ${day.dayNumber}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => setScheduleDraft(null)}
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </aside>
      </div>

      {addModalType ? (
        <AddEntryModal
          type={addModalType}
          tripId={tripId}
          open={Boolean(addModalType)}
          onClose={() => setAddModalType(null)}
          catalogueCityId={catalogueCityId}
          googleSearchContext={destinationLabel}
          locationBias={locationBias}
          onSaved={handleDayAwareSavedItem}
        />
      ) : null}
    </div>
  )
}
