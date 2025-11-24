'use client'

import { useState } from 'react'
import GoogleSearchBar from './GoogleSearchBar'

interface Attraction {
  id: string
  title: string
  category?: string | null
  address?: string | null
  rating?: number | null
  imageUrl?: string | null
  distanceFromLodging?: number | null
  driveTimeMinutes?: number | null
  website?: string | null
  phone?: string | null
}

interface AttractionCardProps {
  attractions: Attraction[]
  tripId: string
  isAdmin: boolean
  googleApiKey: string
}

export default function AttractionCard({
  attractions,
  tripId,
  isAdmin,
  googleApiKey,
}: AttractionCardProps) {
  const [isHydrating, setIsHydrating] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const handlePlaceSelect = async (placeId: string) => {
    setIsHydrating(true)
    try {
      const response = await fetch('/api/hydrate/attractions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, tripId }),
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Failed to add attraction')
      }
    } catch (error) {
      console.error('Error hydrating attraction:', error)
      alert('Failed to add attraction')
    } finally {
      setIsHydrating(false)
      setShowSearch(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Attractions</h2>
        {isAdmin && (
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Add Attraction
          </button>
        )}
      </div>

      {showSearch && isAdmin && (
        <div className="mb-4">
          <GoogleSearchBar
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search for attractions..."
            apiKey={googleApiKey}
          />
        </div>
      )}

      {attractions.length === 0 ? (
        <p className="text-gray-500">No attractions added yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attractions.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                {item.category && (
                  <p className="text-sm text-gray-500 mb-2">{item.category}</p>
                )}
                {item.rating && (
                  <div className="flex items-center mb-2">
                    <span className="text-yellow-500 mr-1">★</span>
                    <span className="text-gray-700">{item.rating.toFixed(1)}</span>
                  </div>
                )}
                {item.distanceFromLodging !== null && (
                  <p className="text-sm text-gray-600">
                    {item.distanceFromLodging} mi
                    {item.driveTimeMinutes !== null &&
                      ` • ${item.driveTimeMinutes} min drive`}
                  </p>
                )}
                {item.address && (
                  <p className="text-xs text-gray-500 mt-2">{item.address}</p>
                )}
                <div className="flex gap-2 mt-3">
                  {item.website && (
                    <a
                      href={item.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Website
                    </a>
                  )}
                  {item.phone && (
                    <a
                      href={`tel:${item.phone}`}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Call
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

