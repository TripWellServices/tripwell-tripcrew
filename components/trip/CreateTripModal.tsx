/**
 * Create Trip Modal - Full TripWell Metadata
 * 
 * Comprehensive form for creating a new trip with all metadata fields
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTripWithMetadata } from '@/lib/actions/trip'
import Image from 'next/image'

interface CreateTripModalProps {
  tripCrew: {
    id: string
    memberships?: Array<{
      traveler: {
        id: string
        firstName: string | null
        lastName: string | null
        photoURL: string | null
      }
    }>
  }
  travelerId: string
  onClose: () => void
}

const TRIP_PURPOSES = [
  { value: 'FAMILY', label: 'Family' },
  { value: 'ANNIVERSARY', label: 'Anniversary' },
  { value: 'WORK', label: 'Work' },
  { value: 'RACE', label: 'Race' },
  { value: 'FRIENDS', label: 'Friends' },
  { value: 'COUPLES', label: 'Couples' },
  { value: 'GENERAL', label: 'General' },
]

const TRIP_TYPES = [
  { value: 'BEACH', label: 'Beach' },
  { value: 'CITY', label: 'City' },
  { value: 'MOUNTAIN', label: 'Mountain' },
  { value: 'ADVENTURE', label: 'Adventure' },
  { value: 'SKI', label: 'Ski' },
  { value: 'CRUISE', label: 'Cruise' },
  { value: 'THEMEPARK', label: 'Theme Park' },
  { value: 'GENERAL', label: 'General' },
]

const BUDGET_LEVELS = [
  { value: 'BUDGET', label: 'Budget' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'LUXURY', label: 'Luxury' },
]

export default function CreateTripModal({ tripCrew, travelerId, onClose }: CreateTripModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    destination: '',
    purpose: 'GENERAL' as const,
    tripType: 'GENERAL' as const,
    budgetLevel: 'MODERATE' as const,
    notes: '',
    attendees: [travelerId], // Default to creator
    coverImage: '',
    startDate: '',
    endDate: '',
  })

  const availableTravelers = tripCrew.memberships || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (!formData.name.trim()) {
      setError('Trip name is required')
      setLoading(false)
      return
    }
    if (!formData.destination.trim()) {
      setError('Destination is required')
      setLoading(false)
      return
    }
    if (!formData.startDate) {
      setError('Start date is required')
      setLoading(false)
      return
    }
    if (!formData.endDate) {
      setError('End date is required')
      setLoading(false)
      return
    }
    if (formData.attendees.length === 0) {
      setError('At least one attendee is required')
      setLoading(false)
      return
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('End date must be after start date')
      setLoading(false)
      return
    }

    try {
      const result = await createTripWithMetadata({
        tripCrewId: tripCrew.id,
        name: formData.name.trim(),
        destination: formData.destination.trim(),
        purpose: formData.purpose,
        tripType: formData.tripType,
        budgetLevel: formData.budgetLevel,
        notes: formData.notes.trim() || undefined,
        attendees: formData.attendees,
        coverImage: formData.coverImage.trim() || undefined,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        travelerId,
      })

      if (!result.success) {
        setError(result.error || 'Failed to create trip')
        setLoading(false)
        return
      }

      // Redirect to trip admin page
      router.push(`/trip/${result.trip?.id}/admin`)
    } catch (err: any) {
      setError(err.message || 'Failed to create trip')
      setLoading(false)
    }
  }

  const toggleAttendee = (travelerIdToToggle: string) => {
    setFormData((prev) => ({
      ...prev,
      attendees: prev.attendees.includes(travelerIdToToggle)
        ? prev.attendees.filter((id) => id !== travelerIdToToggle)
        : [...prev.attendees, travelerIdToToggle],
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Create New Trip</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trip Name & Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trip Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="e.g., Summer Vacation 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination *
              </label>
              <input
                type="text"
                required
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="e.g., Richlands, VA"
              />
            </div>
          </div>

          {/* Purpose, Type, Budget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purpose *
              </label>
              <select
                required
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                {TRIP_PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trip Type *
              </label>
              <select
                required
                value={formData.tripType}
                onChange={(e) => setFormData({ ...formData, tripType: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                {TRIP_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Level *
              </label>
              <select
                required
                value={formData.budgetLevel}
                onChange={(e) => setFormData({ ...formData, budgetLevel: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                {BUDGET_LEVELS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attendees * (Select all who are going)
            </label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
              {availableTravelers.length === 0 ? (
                <p className="text-sm text-gray-500">No members available</p>
              ) : (
                <div className="space-y-2">
                  {availableTravelers.map((membership) => {
                    const traveler = membership.traveler
                    const isSelected = formData.attendees.includes(traveler.id)
                    return (
                      <label
                        key={traveler.id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAttendee(traveler.id)}
                          className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                        />
                        {traveler.photoURL ? (
                          <Image
                            src={traveler.photoURL}
                            alt={traveler.firstName || 'Member'}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 text-sm">
                              {traveler.firstName?.[0] || '?'}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-800">
                          {traveler.firstName} {traveler.lastName}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Image URL (optional)
            </label>
            <input
              type="url"
              value={formData.coverImage}
              onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="Any additional notes about this trip..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

