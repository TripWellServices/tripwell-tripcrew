'use client'

import { useState, useEffect } from 'react'
import { format, eachDayOfInterval, isSameDay } from 'date-fns'

interface ItineraryItem {
  id: string
  title: string
  type: 'dining' | 'attraction'
  itineraryDay: Date | null
}

interface ItineraryCardProps {
  dining: Array<{ id: string; title: string; itineraryDay: Date | null }>
  attractions: Array<{ id: string; title: string; itineraryDay: Date | null }>
  startDate: Date | null
  endDate: Date | null
  tripId: string
  isAdmin: boolean
}

export default function ItineraryCard({
  dining,
  attractions,
  startDate,
  endDate,
  tripId,
  isAdmin,
}: ItineraryCardProps) {
  const [tripDays, setTripDays] = useState<Date[]>([])

  useEffect(() => {
    if (startDate && endDate) {
      const days = eachDayOfInterval({
        start: new Date(startDate),
        end: new Date(endDate),
      })
      setTripDays(days)
    }
  }, [startDate, endDate])

  const allItems: ItineraryItem[] = [
    ...dining.map((d) => ({
      id: d.id,
      title: d.title,
      type: 'dining' as const,
      itineraryDay: d.itineraryDay,
    })),
    ...attractions.map((a) => ({
      id: a.id,
      title: a.title,
      type: 'attraction' as const,
      itineraryDay: a.itineraryDay,
    })),
  ]

  const handleDayChange = async (
    itemId: string,
    itemType: 'dining' | 'attraction',
    day: Date | null
  ) => {
    try {
      await fetch(`/api/trip/${tripId}/itinerary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          itemType,
          itineraryDay: day ? day.toISOString() : null,
        }),
      })
      window.location.reload()
    } catch (error) {
      console.error('Error updating itinerary:', error)
    }
  }

  if (!startDate || !endDate) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Itinerary</h2>
        <p className="text-gray-500">Set trip dates to view itinerary.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Itinerary</h2>

      {tripDays.length === 0 ? (
        <p className="text-gray-500">No days in trip.</p>
      ) : (
        <div className="space-y-6">
          {tripDays.map((day, dayIndex) => {
            const dayItems = allItems.filter(
              (item) =>
                item.itineraryDay &&
                isSameDay(new Date(item.itineraryDay), day)
            )

            return (
              <div key={dayIndex} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">
                  Day {dayIndex + 1} - {format(day, 'EEEE, MMM d')}
                </h3>

                {dayItems.length === 0 ? (
                  <p className="text-gray-400 text-sm">No items scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                      >
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            item.type === 'dining'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {item.type === 'dining' ? '🍽' : '🎯'}
                        </span>
                        <span className="flex-1">{item.title}</span>
                        {isAdmin && (
                          <button
                            onClick={() =>
                              handleDayChange(item.id, item.type, null)
                            }
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {isAdmin && allItems.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">Assign Items to Days</h3>
          <div className="space-y-2">
            {allItems
              .filter((item) => !item.itineraryDay)
              .map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="flex-1">{item.title}</span>
                  <select
                    onChange={(e) => {
                      const dayIndex = parseInt(e.target.value)
                      if (dayIndex >= 0 && dayIndex < tripDays.length) {
                        handleDayChange(item.id, item.type, tripDays[dayIndex])
                      } else {
                        handleDayChange(item.id, item.type, null)
                      }
                    }}
                    className="px-3 py-1 border border-gray-300 rounded"
                    defaultValue=""
                  >
                    <option value="">Not scheduled</option>
                    {tripDays.map((day, idx) => (
                      <option key={idx} value={idx}>
                        Day {idx + 1} - {format(day, 'MMM d')}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

