/**
 * Create Trip Modal
 *
 * Step 0: Type picker (Day Trip vs Vacation)
 * Step 1a: Day Trip — 3 quick fields
 * Step 1b: Vacation — full form
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertTrip } from '@/lib/actions/trip'
import { TripCategory, TripType } from '@prisma/client'

interface CreateTripModalProps {
  tripCrew: {
    id: string
  }
  travelerId: string
  onClose: () => void
}

type Step = 'picker' | 'daytrip' | 'vacation'

const TRIP_CATEGORIES: { value: TripCategory; label: string }[] = [
  { value: 'FAMILY', label: 'Family' },
  { value: 'RELAXATION', label: 'Relaxation' },
  { value: 'BEACH', label: 'Beach' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'ROMANTIC', label: 'Romantic' },
  { value: 'ADVENTURE', label: 'Adventure' },
  { value: 'EVENT', label: 'Event' },
  { value: 'CITY', label: 'City' },
  { value: 'KIDS', label: 'Kids' },
  { value: 'FOOD', label: 'Food' },
]

const COUNTRIES = [
  'United States', 'Canada', 'Mexico', 'United Kingdom', 'France', 'Italy', 'Spain',
  'Germany', 'Greece', 'Portugal', 'Netherlands', 'Belgium', 'Switzerland', 'Austria',
  'Ireland', 'Iceland', 'Norway', 'Sweden', 'Denmark', 'Finland', 'Japan', 'South Korea',
  'China', 'Thailand', 'Vietnam', 'Singapore', 'Malaysia', 'Indonesia', 'Philippines',
  'India', 'Australia', 'New Zealand', 'Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia',
  'Costa Rica', 'Jamaica', 'Bahamas', 'Dominican Republic', 'Other',
]

export default function CreateTripModal({ tripCrew, travelerId, onClose }: CreateTripModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('picker')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showVibes, setShowVibes] = useState(false)

  // Day Trip form state
  const [dayTripData, setDayTripData] = useState({
    tripName: '',
    date: '',
    where: '',
  })

  // Vacation form state
  const [vacationData, setVacationData] = useState({
    tripName: '',
    purpose: '',
    categories: [] as TripCategory[],
    city: '',
    country: '',
    startDate: '',
    endDate: '',
  })

  const toggleCategory = (category: TripCategory) => {
    setVacationData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }))
  }

  const handleDayTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!dayTripData.tripName.trim()) {
      setError('Trip name is required')
      setLoading(false)
      return
    }
    if (!dayTripData.date) {
      setError('Date is required')
      setLoading(false)
      return
    }

    try {
      const result = await upsertTrip({
        crewId: tripCrew.id,
        tripName: dayTripData.tripName.trim(),
        city: dayTripData.where.trim() || undefined,
        startDate: new Date(dayTripData.date),
        tripType: TripType.DAY_TRIP,
        travelerId,
      })

      if (!result.success) {
        setError(result.error || 'Failed to create trip')
        setLoading(false)
        return
      }

      router.push(`/trip/${result.trip?.id}/admin`)
    } catch (err: any) {
      setError(err.message || 'Failed to create trip')
      setLoading(false)
    }
  }

  const handleVacationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!vacationData.tripName.trim()) {
      setError('Trip name is required')
      setLoading(false)
      return
    }
    if (!vacationData.purpose.trim()) {
      setError('Purpose is required')
      setLoading(false)
      return
    }
    if (!vacationData.city.trim()) {
      setError('City is required')
      setLoading(false)
      return
    }
    if (!vacationData.country.trim()) {
      setError('Country is required')
      setLoading(false)
      return
    }
    if (!vacationData.startDate) {
      setError('Start date is required')
      setLoading(false)
      return
    }
    if (!vacationData.endDate) {
      setError('End date is required')
      setLoading(false)
      return
    }
    if (new Date(vacationData.startDate) >= new Date(vacationData.endDate)) {
      setError('End date must be after start date')
      setLoading(false)
      return
    }

    try {
      const result = await upsertTrip({
        crewId: tripCrew.id,
        tripName: vacationData.tripName.trim(),
        purpose: vacationData.purpose.trim(),
        categories: vacationData.categories.length > 0 ? vacationData.categories : undefined,
        city: vacationData.city.trim(),
        country: vacationData.country.trim(),
        startDate: new Date(vacationData.startDate),
        endDate: new Date(vacationData.endDate),
        tripType: TripType.VACATION,
        travelerId,
      })

      if (!result.success) {
        setError(result.error || 'Failed to create trip')
        setLoading(false)
        return
      }

      router.push(`/trip/${result.trip?.id}/admin`)
    } catch (err: any) {
      setError(err.message || 'Failed to create trip')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full mx-4 my-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {step !== 'picker' && (
              <button
                onClick={() => { setStep('picker'); setError('') }}
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="Back to type picker"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-2xl font-bold text-gray-800">
              {step === 'picker' && 'What kind of trip?'}
              {step === 'daytrip' && 'Day Trip'}
              {step === 'vacation' && 'Plan a Vacation'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Step 0: Type Picker */}
        {step === 'picker' && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setStep('daytrip')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-sky-400 hover:bg-sky-50 transition group text-left"
            >
              <span className="text-4xl">☀️</span>
              <div>
                <div className="font-semibold text-gray-800 group-hover:text-sky-700">Day Trip</div>
                <div className="text-xs text-gray-500 mt-0.5">Quick, one-day adventure</div>
              </div>
            </button>
            <button
              onClick={() => setStep('vacation')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-sky-400 hover:bg-sky-50 transition group text-left"
            >
              <span className="text-4xl">✈️</span>
              <div>
                <div className="font-semibold text-gray-800 group-hover:text-sky-700">Vacation</div>
                <div className="text-xs text-gray-500 mt-0.5">Multi-day getaway</div>
              </div>
            </button>
          </div>
        )}

        {/* Step 1a: Day Trip Form */}
        {step === 'daytrip' && (
          <form onSubmit={handleDayTripSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trip Name *
              </label>
              <input
                type="text"
                autoFocus
                required
                value={dayTripData.tripName}
                onChange={(e) => setDayTripData({ ...dayTripData, tripName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Hike to the Falls, Farmer's Market Run"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={dayTripData.date}
                onChange={(e) => setDayTripData({ ...dayTripData, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Where are you going? <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={dayTripData.where}
                onChange={(e) => setDayTripData({ ...dayTripData, where: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Shenandoah, the beach, downtown..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Day Trip'}
              </button>
            </div>
          </form>
        )}

        {/* Step 1b: Vacation Form */}
        {step === 'vacation' && (
          <form onSubmit={handleVacationSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trip Name *
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={vacationData.tripName}
                  onChange={(e) => setVacationData({ ...vacationData, tripName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Paris Adventure"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={vacationData.purpose}
                  onChange={(e) => setVacationData({ ...vacationData, purpose: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Anniversary, Birthday..."
                />
              </div>
            </div>

            {/* Destination */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={vacationData.city}
                  onChange={(e) => setVacationData({ ...vacationData, city: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Paris"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <select
                  required
                  value={vacationData.country}
                  onChange={(e) => setVacationData({ ...vacationData, country: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
                >
                  <option value="">Select Country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={vacationData.startDate}
                  onChange={(e) => setVacationData({ ...vacationData, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  required
                  value={vacationData.endDate}
                  onChange={(e) => setVacationData({ ...vacationData, endDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Vibe Tags — collapsed by default */}
            <div>
              <button
                type="button"
                onClick={() => setShowVibes((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-800 font-medium transition"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showVibes ? 'rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {showVibes ? 'Hide vibe tags' : 'Add vibe tags'}
                {vacationData.categories.length > 0 && (
                  <span className="ml-1 bg-sky-100 text-sky-700 text-xs px-2 py-0.5 rounded-full">
                    {vacationData.categories.length}
                  </span>
                )}
              </button>
              {showVibes && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {TRIP_CATEGORIES.map((cat) => {
                    const isSelected = vacationData.categories.includes(cat.value)
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => toggleCategory(cat.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                          isSelected
                            ? 'bg-sky-600 text-white hover:bg-sky-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Vacation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
