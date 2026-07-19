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
}: TripExperienceCardProps) {
  const router = useRouter()
  const [schedulingKey, setSchedulingKey] = useState<string | null>(null)

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

      {isAdmin && savedItems.length > 0 ? (
        <div className="mb-6 rounded-lg border border-sky-100 bg-sky-50/60 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-sky-950">Saved trip list</h3>
            <p className="text-xs text-sky-800 mt-0.5">
              These were saved in Setup. Add them to a day to build the itinerary.
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
                <h3 className="font-semibold text-lg mb-3">
                  Day {day.dayNumber} — {format(dayDate, 'EEEE, MMM d')}
                </h3>

                {experiences.length === 0 ? (
                  <p className="text-gray-400 text-sm">No experiences scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {experiences.map((exp) => {
                      const { emoji, title, sub } = experienceLabel(exp)
                      const timeBits = [exp.startTime, exp.endTime].filter(Boolean)
                      const timeLine = timeBits.length > 0 ? timeBits.join(' – ') : null
                      const isDining = Boolean(exp.dining)
                      const isAttraction = Boolean(exp.attraction)

                      return (
                        <div
                          key={exp.id}
                          className="flex items-start gap-2 p-2 bg-gray-50 rounded"
                        >
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
                            <button
                              type="button"
                              onClick={() => handleRemoveExperience(exp.id)}
                              className="text-red-500 hover:text-red-700 text-sm shrink-0"
                            >
                              Remove
                            </button>
                          )}
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
        Each block is a TripDay experience (time + dining, attraction, concert, etc.). Save items
        in Setup, then schedule them here.
      </p>
    </div>
  )
}
