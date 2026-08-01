'use client'

import { format } from 'date-fns'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  googleMapsUrlFromMetadata,
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
  website?: string | null
  phone?: string | null
  rating?: number | null
  metadata?: unknown
}

type ScheduleDraft = {
  itemKey: string
  dayId: string
  startTime: string
  endTime: string
  notes: string
}

interface TripExperienceCardProps {
  tripDays: TripDayRow[]
  startDate: Date | null
  endDate: Date | null
  tripId: string
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

function dateForDisplay(day: Pick<TripDayRow, 'date'>): Date {
  const d = new Date(day.date)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export default function TripExperienceCard({
  tripDays,
  startDate,
  endDate,
  tripId,
  savedItems = [],
  canScheduleSavedItems = true,
}: TripExperienceCardProps) {
  const router = useRouter()
  const [schedulingKey, setSchedulingKey] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingEditId, setSavingEditId] = useState<string | null>(null)
  const [expandedSavedItemKey, setExpandedSavedItemKey] = useState<string | null>(null)
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [openDayId, setOpenDayId] = useState<string | null>(null)
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft | null>(null)
  const [scheduledSavedItemKeys, setScheduledSavedItemKeys] = useState<Set<string>>(
    () => new Set()
  )
  const [optimisticExperiencesByDay, setOptimisticExperiencesByDay] = useState<
    Record<string, TripExperienceRow[]>
  >({})
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

  const beginScheduleSavedItem = (item: SavedTripListItem, day: TripDayRow) => {
    setScheduleError(null)
    setExpandedSavedItemKey(`${item.kind}:${item.id}`)
    setScheduleDraft({
      itemKey: `${item.kind}:${item.id}`,
      dayId: day.id,
      startTime: '',
      endTime: '',
      notes: '',
    })
  }

  const handleScheduleSavedItem = async (
    item: SavedTripListItem,
    day: TripDayRow,
    draft: ScheduleDraft
  ) => {
    const key = `${item.kind}:${item.id}:${day.id}`
    const itemKey = `${item.kind}:${item.id}`
    setSchedulingKey(key)
    setScheduleError(null)
    try {
      const body: Record<string, string> = {
        date: dateForApi(day),
      }
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Schedule saved item failed:', err)
        setScheduleError(
          typeof err.error === 'string'
            ? err.error
            : `Could not add ${item.title} to Day ${day.dayNumber}.`
        )
        return
      }
      const created = (await res.json().catch(() => null)) as TripExperienceRow | null
      if (created?.id) {
        setOptimisticExperiencesByDay((prev) => ({
          ...prev,
          [day.id]: [...(prev[day.id] ?? []), created],
        }))
      }
      setScheduledSavedItemKeys((prev) => {
        const next = new Set(prev)
        next.add(itemKey)
        return next
      })
      setScheduleDraft(null)
      setScheduleMessage(`Added ${item.title} to ${format(dateForDisplay(day), 'EEE, MMM d')}.`)
      window.setTimeout(() => setScheduleMessage(null), 7000)
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
  const visibleSavedItems = savedItems.filter(
    (item) => !scheduledSavedItemKeys.has(`${item.kind}:${item.id}`)
  )
  const showTopSavedList = false

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Day plan</h2>

      {scheduleMessage ? (
        <div
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          {scheduleMessage}
        </div>
      ) : null}

      {scheduleError ? (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {scheduleError}
        </div>
      ) : null}

      {showTopSavedList && canScheduleSavedItems && visibleSavedItems.length > 0 ? (
        <div className="mb-6 rounded-lg border border-sky-100 bg-sky-50/60 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-sky-950">Saved trip list</h3>
            <p className="text-xs text-sky-800 mt-0.5">
              Tap a day to choose start time, end time, and notes before it lands on the itinerary.
            </p>
          </div>
          <ul className="space-y-3">
            {visibleSavedItems.map((item) => {
              const itemKey = `${item.kind}:${item.id}`
              const expanded = expandedSavedItemKey === itemKey
              const mapsUrl = googleMapsUrlFromMetadata(item.metadata)
              const metadataLines =
                item.kind === 'dining'
                  ? summarizeDiningMetadata(item.metadata)
                  : item.kind === 'attraction'
                    ? summarizeAttractionMetadata(item.metadata)
                    : []
              const draftDay =
                scheduleDraft?.itemKey === itemKey
                  ? sortedDays.find((day) => day.id === scheduleDraft.dayId) ?? null
                  : null

              return (
                <li
                  key={itemKey}
                  className="rounded-lg border border-white bg-white p-3"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded shrink-0 ${chipClass(savedItemEmoji(item.kind))}`}
                    >
                      {savedItemEmoji(item.kind)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSavedItemKey(expanded ? null : itemKey)
                          }
                          className="min-w-0 text-left"
                        >
                          <div className="font-medium text-gray-900 underline-offset-2 hover:underline">
                            {item.title}
                          </div>
                          {item.category ? (
                            <div className="text-xs text-gray-600">{item.category}</div>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSavedItemKey(expanded ? null : itemKey)
                          }
                          className="shrink-0 text-xs font-medium text-sky-700 hover:underline"
                        >
                          {expanded ? 'Hide details' : 'Details'}
                        </button>
                      </div>
                      {item.address ? (
                        <div className="text-xs text-gray-500 line-clamp-1">{item.address}</div>
                      ) : null}
                      {item.description ? (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      ) : null}

                      {expanded ? (
                        <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
                          {typeof item.rating === 'number' ? (
                            <p className="font-medium text-amber-700">
                              Google rating {item.rating.toFixed(1)}
                            </p>
                          ) : null}
                          {item.address ? <p className="mt-1">{item.address}</p> : null}
                          {item.description ? (
                            <p className="mt-2 text-gray-700">{item.description}</p>
                          ) : null}
                          {metadataLines.map((line, i) => (
                            <p key={i} className="mt-1 text-gray-600">
                              {line}
                            </p>
                          ))}
                          <div className="mt-3 flex flex-wrap gap-3">
                            {mapsUrl ? (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:underline"
                              >
                                Google Maps
                              </a>
                            ) : null}
                            {item.website ? (
                              <a
                                href={item.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:underline"
                              >
                                Website
                              </a>
                            ) : null}
                            {item.phone ? (
                              <a
                                href={`tel:${item.phone}`}
                                className="font-medium text-blue-600 hover:underline"
                              >
                                Call
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {sortedDays.map((day) => {
                          const key = `${item.kind}:${item.id}:${day.id}`
                          const draftActive =
                            scheduleDraft?.itemKey === itemKey && scheduleDraft.dayId === day.id
                          return (
                            <button
                              key={key}
                              type="button"
                              disabled={schedulingKey === key}
                              onClick={() => beginScheduleSavedItem(item, day)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md border border-sky-200 text-sky-800 hover:bg-sky-100 disabled:opacity-50"
                            >
                              {draftActive
                                ? `Planning Day ${day.dayNumber}`
                                : `Plan Day ${day.dayNumber} + time`}
                            </button>
                          )
                        })}
                      </div>
                      {scheduleDraft?.itemKey === itemKey ? (
                        <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/70 p-3">
                          <div className="mb-2 text-xs font-semibold text-sky-950">
                            Set the time slot for{' '}
                            {draftDay
                              ? format(dateForDisplay(draftDay), 'EEE, MMM d')
                              : 'a trip day'}
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                            Notes for this slot
                            <textarea
                              value={scheduleDraft.notes}
                              onChange={(e) =>
                                setScheduleDraft((prev) =>
                                  prev ? { ...prev, notes: e.target.value } : prev
                                )
                              }
                              rows={2}
                              placeholder="Reservation, ticket window, why this belongs here..."
                              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                            />
                          </label>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={
                                !draftDay ||
                                schedulingKey === `${item.kind}:${item.id}:${draftDay.id}`
                              }
                              onClick={() =>
                                draftDay
                                  ? void handleScheduleSavedItem(item, draftDay, scheduleDraft)
                                  : undefined
                              }
                              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                            >
                              {draftDay &&
                              schedulingKey === `${item.kind}:${item.id}:${draftDay.id}`
                                ? 'Adding...'
                                : 'Add to itinerary'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setScheduleDraft(null)}
                              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {sortedDays.length === 0 ? (
        <p className="text-gray-500">No trip days yet. Days are created when you set the trip dates.</p>
      ) : (
        <div className="space-y-6">
          {sortedDays.map((day) => {
            const dayDate = dateForDisplay(day)
            const optimisticExperiences = optimisticExperiencesByDay[day.id] ?? []
            const experiences = [...(day.experiences ?? []), ...optimisticExperiences].sort(
              (a, b) => a.orderIndex - b.orderIndex
            )
            const dayIsOpen =
              openDayId === day.id ||
              (openDayId === null && day.dayNumber === sortedDays[0]?.dayNumber)

            return (
              <div
                key={day.id}
                className={`rounded-lg border p-4 ${
                  dayIsOpen ? 'border-sky-200 bg-sky-50/30' : 'border-gray-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenDayId(dayIsOpen ? '' : day.id)}
                  aria-expanded={dayIsOpen}
                  className="mb-3 flex w-full items-start justify-between gap-3 rounded-lg text-left"
                >
                  <span>
                    <span className="block font-semibold text-lg text-gray-900">
                      {format(dayDate, 'EEEE, MMM d')}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-sky-800">
                      {dayIsOpen
                        ? 'Day is open - add saved places and edit time slots below'
                        : `Use Build Day ${day.dayNumber} to add places and times`}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Day {day.dayNumber}
                  </span>
                </button>

                {dayIsOpen && canScheduleSavedItems && visibleSavedItems.length > 0 ? (
                  <div className="mb-4 rounded-lg border border-sky-100 bg-sky-50/70 p-3">
                    <h4 className="text-sm font-semibold text-sky-950">
                      Saved places for Day {day.dayNumber}
                    </h4>
                    <p className="mt-0.5 text-xs text-sky-800">
                      Pick one, set its time, and save it into this day's itinerary.
                    </p>
                    <div className="mt-3 space-y-2">
                      {visibleSavedItems.map((item) => {
                        const itemKey = `${item.kind}:${item.id}`
                        const draftActive =
                          scheduleDraft?.itemKey === itemKey && scheduleDraft.dayId === day.id
                        return (
                          <div key={itemKey} className="rounded-md bg-white p-3 ring-1 ring-sky-100">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900">{item.title}</p>
                                {item.category ? (
                                  <p className="text-xs text-gray-600">{item.category}</p>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => beginScheduleSavedItem(item, day)}
                                className="shrink-0 rounded-md border border-sky-200 px-2.5 py-1 text-xs font-medium text-sky-800 hover:bg-sky-50"
                              >
                                {draftActive ? 'Setting time...' : 'Set time'}
                              </button>
                            </div>
                            {draftActive ? (
                              <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/70 p-3">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                                    disabled={schedulingKey === `${item.kind}:${item.id}:${day.id}`}
                                    onClick={() => void handleScheduleSavedItem(item, day, scheduleDraft)}
                                    className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                                  >
                                    {schedulingKey === `${item.kind}:${item.id}:${day.id}`
                                      ? 'Adding...'
                                      : `Save to Day ${day.dayNumber} itinerary`}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setScheduleDraft(null)}
                                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
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
                  </div>
                ) : null}

                {experiences.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4">
                    <p className="text-gray-500 text-sm">
                      {dayIsOpen
                        ? `No timed itinerary items yet. Set a time on a saved place above to lock it into Day ${day.dayNumber}.`
                        : `No timed itinerary items yet. Build Day ${day.dayNumber} to add saved places and times.`}
                    </p>
                    {!dayIsOpen ? (
                      <button
                        type="button"
                        onClick={() => setOpenDayId(day.id)}
                        className="mt-3 w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                      >
                        Build Day {day.dayNumber}
                      </button>
                    ) : null}
                  </div>
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
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => beginEditExperience(exp)}
                              className="text-sky-600 hover:text-sky-800 text-sm"
                            >
                              Open / edit time
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveExperience(exp.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
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
        Save restaurants and places to the trip, plan them into a day with times, then use Edit on
        the day item to adjust the time or notes later.
      </p>
    </div>
  )
}
