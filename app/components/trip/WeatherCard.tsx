'use client'

import { useEffect, useState } from 'react'

interface WeatherForecast {
  date: string
  temp: number
  tempMin: number
  tempMax: number
  description: string
  icon: string
  humidity: number
  windSpeed: number
}

interface WeatherCardProps {
  tripId: string
}

export default function WeatherCard({ tripId }: WeatherCardProps) {
  const [forecasts, setForecasts] = useState<WeatherForecast[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(`/api/weather/${tripId}`)
        if (response.ok) {
          const data = await response.json()
          setForecasts(data.forecasts || [])
        } else {
          setError('Weather data not available')
        }
      } catch (err) {
        setError('Failed to load weather')
      } finally {
        setIsLoading(false)
      }
    }

    fetchWeather()
  }, [tripId])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Weather Forecast</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error || forecasts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Weather Forecast</h2>
        <p className="text-gray-500">
          {error || 'Weather forecast not available. Add lodging with location to see forecast.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">7-Day Forecast</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {forecasts.map((forecast, index) => (
          <div
            key={index}
            className="text-center p-4 border border-gray-200 rounded-lg"
          >
            <div className="text-sm text-gray-600 mb-2">
              {new Date(forecast.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <img
              src={`https://openweathermap.org/img/wn/${forecast.icon}@2x.png`}
              alt={forecast.description}
              className="mx-auto mb-2"
            />
            <div className="text-2xl font-bold text-gray-800">
              {Math.round(forecast.temp)}°
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {Math.round(forecast.tempMin)}° / {Math.round(forecast.tempMax)}°
            </div>
            <div className="text-xs text-gray-500 mt-2 capitalize">
              {forecast.description}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              💧 {forecast.humidity}% • 💨 {Math.round(forecast.windSpeed)} mph
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

