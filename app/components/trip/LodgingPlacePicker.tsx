'use client'

import { useState } from 'react'
import GoogleSearchBar from '@/app/components/trip/GoogleSearchBar'
import type { LodgingCardLodging } from '@/app/components/trip/LodgingCard'
import { GOOGLE_PLACES_ENV_HINT } from '@/lib/google-places-config'

export type LodgingPlaceSelection = {
  title: string
  address?: string | null
  streetAddress?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  countryCode?: string | null
  phone?: string | null
  website?: string | null
  googlePlaceId?: string | null
  imageUrl?: string | null
  rating?: number | null
  lat?: number | null
  lng?: number | null
  defaultCheckInTime?: string | null
  defaultCheckOutTime?: string | null
}

type LodgingPlacePickerProps = {
  googleApiKey: string
  value: LodgingPlaceSelection | null
  onChange: (next: LodgingPlaceSelection | null) => void
  /** When set, persist via /api/hydrate/lodging instead of preview-only. */
  tripId?: string
  compact?: boolean
  /** When set, called after hydrate save instead of full page reload. */
  onHydrated?: (lodging: LodgingCardLodging) => void
}

export default function LodgingPlacePicker({
  googleApiKey,
  value,
  onChange,
  tripId,
  compact = false,
  onHydrated,
}: LodgingPlacePickerProps) {
  const [isHydrating, setIsHydrating] = useState(false)
  const [showSearch, setShowSearch] = useState(!value)

  async function handlePlaceSelect(placeId: string) {
    setIsHydrating(true)
    try {
      if (tripId) {
        const response = await fetch('/api/hydrate/lodging', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId, tripId }),
        })
        if (!response.ok) throw new Error('Failed to save lodging')
        const lodging = (await response.json()) as LodgingCardLodging
        onChange({
          title: lodging.title,
          address: lodging.address,
          streetAddress: lodging.streetAddress,
          city: lodging.city,
          state: lodging.state,
          postalCode: lodging.postalCode,
          countryCode: lodging.countryCode,
          phone: lodging.phone,
          website: lodging.website,
          googlePlaceId: placeId,
          imageUrl: lodging.imageUrl,
          rating: lodging.rating,
          lat: lodging.lat,
          lng: lodging.lng,
          defaultCheckInTime: lodging.defaultCheckInTime,
          defaultCheckOutTime: lodging.defaultCheckOutTime,
        })
        if (onHydrated) {
          onHydrated(lodging)
          setShowSearch(false)
          return
        }
        window.location.reload()
        return
      }

      const response = await fetch('/api/hydrate/lodging/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId }),
      })
      if (!response.ok) throw new Error('Failed to load place')
      const data = (await response.json()) as LodgingPlaceSelection
      onChange({
        ...data,
        defaultCheckInTime: value?.defaultCheckInTime ?? data.defaultCheckInTime ?? null,
        defaultCheckOutTime: value?.defaultCheckOutTime ?? data.defaultCheckOutTime ?? null,
      })
      setShowSearch(false)
    } catch (error) {
      console.error('Lodging picker error:', error)
      alert('Failed to load lodging details')
    } finally {
      setIsHydrating(false)
    }
  }

  function patchTimes(patch: Partial<LodgingPlaceSelection>) {
    if (!value) return
    onChange({ ...value, ...patch })
  }

  return (
    <div className="space-y-4">
      {!googleApiKey ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Google Places is not configured — lodging search needs a Google Maps/Places API key.{' '}
          {GOOGLE_PLACES_ENV_HINT}
        </p>
      ) : null}

      {value ? (
        <div className={`rounded-lg border border-gray-200 bg-white ${compact ? 'p-4' : 'p-5'}`}>
          {value.imageUrl ? (
            <img
              src={value.imageUrl}
              alt={value.title}
              className="w-full h-40 object-cover rounded-lg mb-3"
            />
          ) : null}
          <h4 className="font-semibold text-gray-900">{value.title}</h4>
          {value.address ? (
            <p className="text-sm text-gray-600 mt-1">{value.address}</p>
          ) : null}
          {value.rating != null ? (
            <p className="text-sm text-gray-700 mt-1">★ {value.rating.toFixed(1)}</p>
          ) : null}
          <div className="flex flex-wrap gap-3 mt-3 text-sm">
            {value.website ? (
              <a
                href={value.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Website
              </a>
            ) : null}
            {value.phone ? (
              <a href={`tel:${value.phone}`} className="text-blue-600 hover:underline">
                {value.phone}
              </a>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1">Check-in</span>
              <input
                type="time"
                value={value.defaultCheckInTime ?? ''}
                onChange={(e) => patchTimes({ defaultCheckInTime: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-gray-500 mb-1">Check-out</span>
              <input
                type="time"
                value={value.defaultCheckOutTime ?? ''}
                onChange={(e) => patchTimes({ defaultCheckOutTime: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>
          </div>

          {googleApiKey ? (
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setShowSearch(true)
              }}
              className="mt-4 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Change stay
            </button>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
          <p className="text-gray-600 text-sm mb-3">
            Search for your hotel or rental — we use this for nearby suggestions.
          </p>
          {googleApiKey ? (
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Search lodging
            </button>
          ) : null}
        </div>
      )}

      {showSearch && googleApiKey ? (
        <div>
          <GoogleSearchBar
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search for hotels, Airbnb, etc..."
            apiKey={googleApiKey}
          />
          {isHydrating ? (
            <p className="text-sm text-gray-500 mt-2">Loading place details…</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
