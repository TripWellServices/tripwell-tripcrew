/**
 * Create Trip Modal - Final Architecture
 * 
 * Simplified trip creation form (3-minute flow)
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertTrip } from '@/lib/actions/trip'
import { TripCategory } from '@prisma/client'

interface CreateTripModalProps {
  tripCrew: {
    id: string
  }
  travelerId: string
  onClose: () => void
}

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

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY',
]

const COUNTRIES = [
  'United States',
  'Canada',
  'Mexico',
  'United Kingdom',
  'France',
  'Italy',
  'Spain',
  'Germany',
  'Greece',
  'Portugal',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Ireland',
  'Iceland',
  'Norway',
  'Sweden',
  'Denmark',
  'Finland',
  'Japan',
  'South Korea',
  'China',
  'Thailand',
  'Vietnam',
  'Singapore',
  'Malaysia',
  'Indonesia',
  'Philippines',
  'India',
  'Australia',
  'New Zealand',
  'Brazil',
  'Argentina',
  'Chile',
  'Peru',
  'Colombia',
  'Costa Rica',
  'Jamaica',
  'Bahamas',
  'Dominican Republic',
  'Other',
]

export default function CreateTripModal({ tripCrew, travelerId, onClose }: CreateTripModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    tripName: '',
    purpose: '',
    categories: [] as TripCategory[],
    city: '',
    state: '',
    country: '',
    startDate: '',
    endDate: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (!formData.tripName.trim()) {
      setError('Trip name is required')
      setLoading(false)
      return
    }
    if (!formData.purpose.trim()) {
      setError('Purpose is required')
      setLoading(false)
      return
    }
    if (!formData.city.trim()) {
      setError('City is required')
      setLoading(false)
      return
    }
    if (!formData.country.trim()) {
      setError('Country is required')
      setLoading(false)
      return
    }

    // If US is selected, state is required
    const isUS = formData.country === 'United States' || formData.country === 'USA'
    if (isUS && !formData.state.trim()) {
      setError('State is required for US destinations')
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
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('End date must be after start date')
      setLoading(false)
      return
    }

    try {
      const result = await upsertTrip({
        crewId: tripCrew.id,
        tripName: formData.tripName.trim(),
        purpose: formData.purpose.trim(),
        categories: formData.categories.length > 0 ? formData.categories : undefined,
        city: formData.city.trim(),
        state: (formData.country === 'United States' || formData.country === 'USA') 
          ? formData.state.trim() || undefined 
          : undefined, // Only include state for US
        country: formData.country.trim(),
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

  const toggleCategory = (category: TripCategory) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
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
          {/* Trip Name & Purpose */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trip Name *
              </label>
              <input
                type="text"
                required
                value={formData.tripName}
                onChange={(e) => setFormData({ ...formData, tripName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Paris Adventure, Beach Getaway"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purpose *
              </label>
              <input
                type="text"
                required
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Anniversary, Birthday, Relaxation"
              />
            </div>
          </div>

          {/* Categories - Multi-select Pill Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories (optional) - Select all that apply
            </label>
            <div className="flex flex-wrap gap-2">
              {TRIP_CATEGORIES.map((cat) => {
                const isSelected = formData.categories.includes(cat.value)
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => toggleCategory(cat.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
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
          </div>

          {/* Destination: City, State (US only), Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Paris"
                />
              </div>
              {(formData.country === 'United States' || formData.country === 'USA') ? (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">State *</label>
                  <select
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select State</option>
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="hidden md:block"></div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Country *</label>
                <select
                  required
                  value={formData.country}
                  onChange={(e) => {
                    const newCountry = e.target.value
                    // Clear state if switching away from US
                    const wasUS = formData.country === 'United States' || formData.country === 'USA'
                    const isNowUS = newCountry === 'United States' || newCountry === 'USA'
                    setFormData({
                      ...formData,
                      country: newCountry,
                      state: wasUS && !isNowUS ? '' : formData.state, // Clear state if leaving US
                    })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
                >
                  <option value="">Select Country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {formData.country && formData.country !== 'United States' && formData.country !== 'USA' && (
              <p className="mt-2 text-xs text-gray-500">
                Format: {formData.city || 'City'}, {formData.country}
              </p>
            )}
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
