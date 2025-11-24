'use client'

import { useState, useRef, useEffect } from 'react'

interface GoogleSearchBarProps {
  onPlaceSelect: (placeId: string, placeName: string) => void
  placeholder?: string
  apiKey: string
}

export default function GoogleSearchBar({
  onPlaceSelect,
  placeholder = 'Search for places...',
  apiKey,
}: GoogleSearchBarProps) {
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteService = useRef<any>(null)
  const placesService = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService()
      placesService.current = new window.google.maps.places.PlacesService(
        document.createElement('div')
      )
    }
  }, [])

  useEffect(() => {
    if (!apiKey || typeof window === 'undefined' || !window.google) {
      // Load Google Maps script
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.google) {
          autocompleteService.current = new window.google.maps.places.AutocompleteService()
          placesService.current = new window.google.maps.places.PlacesService(
            document.createElement('div')
          )
        }
      }
      document.head.appendChild(script)
    }
  }, [apiKey])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    if (value.length > 2 && autocompleteService.current) {
      setIsLoading(true)
      autocompleteService.current.getPlacePredictions(
        {
          input: value,
          types: ['establishment'],
        },
        (predictions: any[], status: string) => {
          setIsLoading(false)
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            setPredictions(predictions || [])
          } else {
            setPredictions([])
          }
        }
      )
    } else {
      setPredictions([])
    }
  }

  const handlePlaceSelect = (placeId: string, description: string) => {
    setQuery(description)
    setPredictions([])
    onPlaceSelect(placeId, description)
  }

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {isLoading && (
        <div className="absolute right-3 top-2.5">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        </div>
      )}
      {predictions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handlePlaceSelect(prediction.place_id, prediction.description)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            >
              <div className="font-medium">{prediction.structured_formatting.main_text}</div>
              <div className="text-sm text-gray-500">
                {prediction.structured_formatting.secondary_text}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

declare global {
  interface Window {
    google: any
  }
}

