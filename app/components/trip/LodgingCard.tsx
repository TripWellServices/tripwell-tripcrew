'use client'

import { useState } from 'react'
import GoogleSearchBar from './GoogleSearchBar'

interface LodgingCardProps {
  lodging: {
    id: string
    title: string
    address?: string | null
    website?: string | null
    phone?: string | null
    imageUrl?: string | null
    rating?: number | null
  } | null
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
            onClick={() => setShowSearch(!showSearch)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
          <h3 className="text-xl font-semibold mb-2">{lodging.title}</h3>
          {lodging.address && (
            <p className="text-gray-600 mb-2">{lodging.address}</p>
          )}
          {lodging.rating && (
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
          <p className="text-gray-500">No lodging added yet. Search above to add one.</p>
        )
      )}
    </div>
  )
}

