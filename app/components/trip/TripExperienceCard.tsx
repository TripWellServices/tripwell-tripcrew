'use client'

import { format } from 'date-fns'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  summarizeAttractionMetadata,
  summarizeDiningMetadata,
} from '@/lib/trip-experience-display'

/** Shape matches getTrip → tripDays → experiences include (serializable from server). */
export type TripDayRow = {
  id: string
  date: Date | string
  dayNumber: number
  experiences: TripExperienceRow[]
}

export type TripExperienceRow = {
  id: string
  orderIndex: number
  startTime: string | null
  endTime: string | null
  status: string
  notes: string | null
  hike?: { id: string; name: string; trailOrPlace?: string | null } | null
  dining?: {
    id: string
    title: string
    category?: string | null
    description?: string | null
    metadata?: unknown
  } | null
  attraction?: {
    id: string
    title: string
    category?: string | null
    description?: string | null
    metadata?: unknown
  } | null
  concert?: { id: string; name: string; artist?: string | null; venue?: string | null } | null
  sport?: { id: string; name: string; venue?: string | null } | null
  adventure?: { id: string; name: string } | null
  cruise?: { id: string; name: string } | null
}

export type SavedTripListItem = {
  kind: 'dining' | 'attraction' | 'adventure' | 'concert'
  id: string
  title: string
  category?: string | null
  description?: string | null
  address?: string | null
}

interface TripExperienceCardProps {
  tripDays: TripDayRow[]
  startDate: Date | null
  endDate: Date | null
  tripId: string
  isAdmin: boolean
  savedItems?: SavedTripListItem[]
  canScheduleSavedItems?: boolean
}

function experienceLabel(
  exp: TripExperienceRow
): { emoji: string; title: string; sub?: string } {
  if (exp.dining) {
    return {
      emoji: '🍽',
      title: exp.dining.title,
      sub: exp.dining.category ?? undefined,
    }
  }
  if (exp.attraction) {
    return {
      emoji: '🎯',
      title: exp.attraction.title,
      sub: exp.attraction.category ?? undefined,
    }
  }
  if (exp.hike) {
    const sub = exp.hike.trailOrPlace ? String(exp.hike.trailOrPlace) : undefined
    return { emoji: '🥾', title: exp.hike.name, sub }
  }
  if (exp.concert) {
    const parts = [exp.concert.artist, exp.concert.venue].filter(Boolean).join(' · ')
    return { emoji: '🎵', title: exp.concert.name, sub: parts || undefined }
  }
  if (exp.sport) {
    return { emoji: '⚽', title: exp.sport.name, sub: exp.sport.venue ?? undefined }
  }
  if (exp.adventure) {
    return { emoji: '🧗', title: exp.adventure.name }
  }
  if (exp.cruise) {
    return { emoji: '🚢', title: exp.cruise.name }
  }
  return { emoji: '📌', title: exp.notes?.trim() || 'Experience' }
}

function chipClass(emoji: string): string {
  if (emoji === '🍽') return 'bg-green-100 text-green-800'
  if (emoji === '🎯') return 'bg-blue-100 text-blue-800'
  if (emoji === '🥾') return 'bg-amber-100 text-amber-900'
  if (emoji === '🎵') return 'bg-purple-100 text-purple-900'
  if (emoji === '⚽') return 'bg-orange-100 text-orange-900'
  if (emoji === '🧗') return 'bg-rose-100 text-rose-900'
  if (emoji === '🚢') return 'bg-cyan-100 text-cyan-900'
  return 'bg-gray-100 text-gray-800'
}

function savedItemEmoji(kind: SavedTripListItem['kind']): string {
  if (kind === 'dining') return '🍽'
  if (kind === 'attraction') return '🎯'
  if (kind === 'concert') return '🎵'
  return '🧗'
}

function dateForApi(day: TripDayRow): string {
  const d = new Date(day.date)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dayOfMonth = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dayOfMonth}`
}

export default function TripExperienceCard({
  tripDays,
  startDate,
  endDate,
  tripId,
  isAdmin,
  savedItems = [],
  canScheduleSavedItems = isAdmin,
}: TripExperienceCardProps) {
  const router = useRouter()
  const [schedulingKey, setSchedulingKey] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingEditId, setSavingEditId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({
    startTime: '',
    endTime: '',
    notes: '',
  })

  const handleRemoveExperience = async (experienceId: string) => {
    try {
      const res = await fetch(`/api/trip/${tripId}/itinerary-items/${experienceId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Remove itinerary item failed:', err)
        return
      }
      router.refresh()
    } catch (error) {
      console.error('Error removing experience:', error)
    }
  }

  const handleScheduleSavedItem = async (item: SavedTripListItem, day: TripDayRow) => {
    const key = `${item.kind}:${item.id}:${day.id}`
    setSchedulingKey(key)
    try {
      const body: Record<string, string> = {
        date: dateForApi(day),
        title: item.title,
      }
      if (item.kind === 'dining') body.diningId = item.id
      if (item.kind === 'attraction') body.attractionId = item.id
      if (item.kind === 'adventure') body.adventureId = item.id
      if (item.kind === 'concert') body.concertId = item.id

      const res = await fetch(`/api/trip/${tripId}/itinerary-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Schedule saved item failed:', err)
        return
      }
      router.refresh()
    } catch (error) {
      console.error('Error scheduling saved item:', error)
    } finally {
      setSchedulingKey(null)
    }
  }

  const beginEditExperience = (exp: TripExperienceRow) => {
    setEditingId(exp.id)
    setEditDraft({
      startTime: exp.startTime ?? '',
      endTime: exp.endTime ?? '',
      notes: exp.notes ?? '',
    })
  }

  const handleSaveExperienceEdit = async (experienceId: string) => {
    setSavingEditId(experienceId)
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Update itinerary item failed:', err)
        return
      }
      setEditingId(null)
      router.refresh()
    } catch (error) {
      console.error('Error updating experience:', error)
    } finally {
      setSavingEditId(null)
    }
  }

  if (!startDate || !endDate) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Day plan</h2>
        <p className="text-gray-500">Set trip dates to view your schedule.</p>
      </div>
    )
  }

  const sortedDays = [...tripDays].sort((a, b) => a.dayNumber - b.dayNumber)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Day plan</h2>

      {canScheduleSavedItems && savedItems.length > 0 ? (
        <div className="mb-6 rounded-lg border border-sky-100 bg-sky-50/60 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-sky-950">Saved trip list</h3>
            <p className="text-xs text-sky-800 mt-0.5">
              Add these saved restaurants and places to a day when you know where they belong.
            </p>
          </div>
          <ul className="space-y-3">
            {savedItems.map((item) => (
              <li
                key={`${item.kind}:${item.id}`}
                className="rounded-lg border border-white bg-white p-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`px-2 py-1 text-xs rounded shrink-0 ${chipClass(savedItemEmoji(item.kind))}`}
                  >
                    {savedItemEmoji(item.kind)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    {item.category ? (
                      <div className="text-xs text-gray-600">{item.category}</div>
                    ) : null}
                    {item.address ? (
                      <div className="text-xs text-gray-500 line-clamp-1">{item.address}</div>
                    ) : null}
                    {item.description ? (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sortedDays.map((day) => {
                        const key = `${item.kind}:${item.id}:${day.id}`
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={schedulingKey === key}
                            onClick={() => void handleScheduleSavedItem(item, day)}
                            className="px-2.5 py-1 text-xs font-medium rounded-md border border-sky-200 text-sky-800 hover:bg-sky-100 disabled:opacity-50"
                          >
                            {schedulingKey === key
                              ? 'Adding...'
                              : `Add to Day ${day.dayNumber}`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sortedDays.length === 0 ? (
        <p className="text-gray-500">No trip days yet. Days are created when you set the trip dates.</p>
      ) : (
        <div className="space-y-6">
          {sortedDays.map((day) => {
            const dayDate = new Date(day.date)
            const experiences = [...(day.experiences ?? [])].sort(
              (a, b) => a.orderIndex - b.orderIndex
            )

            return (
              <div key={day.id} className="border border-gray-200 rounded-lg p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {format(dayDate, 'EEEE, MMM d')}
                  </h3>
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Day {day.dayNumber}
                  </span>
                </div>

                {experiences.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No plans on this date yet. Add restaurants or places above, then tap Add to Day{' '}
                    {day.dayNumber}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {experiences.map((exp) => {
                      const { emoji, title, sub } = experienceLabel(exp)
                      const timeBits = [exp.startTime, exp.endTime].filter(Boolean)
                      const timeLine = timeBits.length > 0 ? timeBits.join(' – ') : null
                      const isDining = Boolean(exp.dining)
                      const isAttraction = Boolean(exp.attraction)

                      return (
                        <div key={exp.id}>
                          <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                          <span
                            className={`px-2 py-1 text-xs rounded shrink-0 ${chipClass(emoji)}`}
                          >
                            {emoji}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{title}</div>
                            {sub && (
                              <div className="text-xs text-gray-600 truncate">{sub}</div>
                            )}
                            {timeLine && (
                              <div className="text-xs text-gray-500 mt-0.5 font-medium">
                                {timeLine}
                              </div>
                            )}
                            {isAttraction && exp.attraction?.description?.trim() ? (
                              <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                                {exp.attraction.description.trim()}
                              </p>
                            ) : null}
                            {isAttraction &&
                              summarizeAttractionMetadata(exp.attraction?.metadata).map(
                                (line, i) => (
                                  <p key={`am-${i}`} className="text-xs text-gray-600 mt-1">
                                    {line}
                                  </p>
                                )
                              )}
                            {isDining && exp.dining?.description?.trim() ? (
                              <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                                {exp.dining.description.trim()}
                              </p>
                            ) : null}
                            {isDining &&
                              summarizeDiningMetadata(exp.dining?.metadata).map((line, i) => (
                                <p key={`dm-${i}`} className="text-xs text-gray-600 mt-1">
                                  {line}
                                </p>
                              ))}
                            {exp.notes?.trim() ? (
                              <div className="text-xs text-gray-600 mt-0.5">
                                {exp.notes.trim()}
                              </div>
                            ) : null}
                            {exp.status && exp.status !== 'PLANNED' && (
                              <div className="text-xs text-gray-500 mt-0.5 capitalize">
                                {exp.status.toLowerCase()}
                              </div>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => beginEditExperience(exp)}
                                className="text-sky-600 hover:text-sky-800 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveExperience(exp.id)}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                          </div>
                          {editingId === exp.id ? (
                          <div className="mt-2 rounded-lg border border-sky-100 bg-white p-3">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <label className="block text-xs font-medium text-gray-600">
                                Start time
                                <input
                                  type="time"
                                  value={editDraft.startTime}
                                  onChange={(e) =>
                                    setEditDraft((prev) => ({
                                      ...prev,
                                      startTime: e.target.value,
                                    }))
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
                                    setEditDraft((prev) => ({
                                      ...prev,
                                      endTime: e.target.value,
                                    }))
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
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                  }))
                                }
                                rows={2}
                                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                              />
                            </label>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleSaveExperienceEdit(exp.id)}
                                disabled={savingEditId === exp.id}
                                className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                              >
                                {savingEditId === exp.id ? 'Saving...' : 'Save changes'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-6 text-sm text-gray-500">
        Save restaurants and places to the trip, add them to a date, then use Edit to adjust time
        and notes.
      </p>
    </div>
  )
}
