'use client'

import type { Decimal, JsonValue } from '@prisma/client/runtime/library'
import { useMemo, useState } from 'react'
import GoogleSearchBar from './GoogleSearchBar'

const LODGING_TYPE_LABELS: Record<string, string> = {
  HOTEL: 'Hotel',
  RESORT: 'Resort',
  EXTENDED_STAY: 'Extended stay',
  VACATION_RENTAL: 'Vacation rental',
  HOSTEL: 'Hostel',
  BED_AND_BREAKFAST: 'B&B',
  OTHER: 'Other',
}

function formatMoney(
  amount: string | number | Decimal | null | undefined,
  currency: string | null | undefined
) {
  if (amount == null || amount === '') return null
  const n =
    typeof amount === 'object' && amount !== null && 'toNumber' in amount
      ? (amount as Decimal).toNumber()
      : typeof amount === 'number'
        ? amount
        : Number(amount)
  if (!Number.isFinite(n)) return null
  const cur = (currency || 'USD').toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur.length === 3 ? cur : 'USD',
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${cur} ${n.toFixed(2)}`
  }
}

function amenityEntries(amenities: JsonValue | null | undefined): string[] {
  if (!amenities || typeof amenities !== 'object' || Array.isArray(amenities)) return []
  return Object.entries(amenities as Record<string, unknown>)
    .filter(([, v]) => v === true || v === 'true' || v === 1)
    .map(([k]) =>
      k
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase())
    )
}

export type LodgingCardLodging = {
  id: string
  title: string
  chain?: string | null
  lodgingType?: string | null
  amenities?: JsonValue | null
  nightlyRate?: string | number | Decimal | null
  currency?: string | null
  address?: string | null
  streetAddress?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  countryCode?: string | null
  defaultCheckInTime?: string | null
  defaultCheckOutTime?: string | null
  website?: string | null
  phone?: string | null
  imageUrl?: string | null
  rating?: number | null
}

interface LodgingCardProps {
  lodging: LodgingCardLodging | null
  tripId: string
  isAdmin: boolean
  googleApiKey: string
}

export default function LodgingCard({
  lodging,
  tripId,
  isAdmin,
  googleApiKey,
}: LodgingCardProps) {
  const [isHydrating, setIsHydrating] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const structuredLines = useMemo(() => {
    if (!lodging) return []
    const parts: string[] = []
    if (lodging.streetAddress?.trim()) {
      parts.push(lodging.streetAddress.trim())
    }
    const cityLine = [lodging.city, lodging.state, lodging.postalCode]
      .filter(Boolean)
      .join(', ')
    if (cityLine) parts.push(cityLine)
    if (lodging.countryCode?.trim()) {
      parts.push(lodging.countryCode.trim())
    }
    return parts
  }, [lodging])

  const amenityTags = useMemo(
    () => (lodging ? amenityEntries(lodging.amenities ?? undefined) : []),
    [lodging]
  )

  const priceLabel = useMemo(
    () =>
      lodging
        ? formatMoney(lodging.nightlyRate ?? undefined, lodging.currency ?? undefined)
        : null,
    [lodging]
  )

  const handlePlaceSelect = async (placeId: string) => {
    setIsHydrating(true)
    try {
      const response = await fetch('/api/hydrate/lodging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, tripId }),
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to add lodging')
      }
    } catch (error) {
      console.error('Error hydrating lodging:', error)
      alert('Failed to add lodging')
    } finally {
      setIsHydrating(false)
      setShowSearch(false)
    }
  }

  if (!lodging && !isAdmin) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Lodging</h2>
        {isAdmin && !lodging && (
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            disabled={isHydrating}
          >
            Add Lodging
          </button>
        )}
      </div>

      {showSearch && isAdmin && (
        <div className="mb-4">
          <GoogleSearchBar
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search for hotels, Airbnb, etc..."
            apiKey={googleApiKey}
          />
        </div>
      )}

      {lodging ? (
        <div>
          {lodging.imageUrl && (
            <img
              src={lodging.imageUrl}
              alt={lodging.title}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
          )}
          <h3 className="text-xl font-semibold mb-1">{lodging.title}</h3>
          {lodging.chain?.trim() && (
            <p className="text-sm text-gray-600 mb-1">{lodging.chain.trim()}</p>
          )}
          {lodging.lodgingType && (
            <p className="text-sm text-indigo-700 mb-2">
              {LODGING_TYPE_LABELS[lodging.lodgingType] ?? lodging.lodgingType.replace(/_/g, ' ')}
            </p>
          )}
          {priceLabel && (
            <p className="text-gray-800 font-medium mb-2">
              From {priceLabel}
              <span className="text-gray-500 font-normal text-sm"> / night</span>
            </p>
          )}
          {(lodging.defaultCheckInTime || lodging.defaultCheckOutTime) && (
            <p className="text-sm text-gray-600 mb-2">
              {lodging.defaultCheckInTime && <>Check-in: {lodging.defaultCheckInTime}</>}
              {lodging.defaultCheckInTime && lodging.defaultCheckOutTime && ' · '}
              {lodging.defaultCheckOutTime && <>Check-out: {lodging.defaultCheckOutTime}</>}
            </p>
          )}
          {structuredLines.length > 0 ? (
            <div className="text-gray-600 mb-2 space-y-0.5">
              {structuredLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : (
            lodging.address && (
              <p className="text-gray-600 mb-2">{lodging.address}</p>
            )
          )}
          {amenityTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {amenityTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {lodging.rating != null && Number.isFinite(lodging.rating) && (
            <div className="flex items-center mb-2">
              <span className="text-yellow-500 mr-1">★</span>
              <span className="text-gray-700">{lodging.rating.toFixed(1)}</span>
            </div>
          )}
          <div className="flex gap-4 mt-4">
            {lodging.website && (
              <a
                href={lodging.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Website
              </a>
            )}
            {lodging.phone && (
              <a
                href={`tel:${lodging.phone}`}
                className="text-blue-500 hover:underline"
              >
                {lodging.phone}
              </a>
            )}
          </div>
        </div>
      ) : (
        isAdmin && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
            <p className="text-gray-600 text-sm mb-3">No lodging yet — search to add a hotel or rental.</p>
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
            >
              Search lodging
            </button>
          </div>
        )
      )}
    </div>
  )
}
