import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: params.tripId },
      include: { lodging: true },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    if (!trip.lodging || !trip.lodging.lat || !trip.lodging.lng) {
      return NextResponse.json(
        { error: 'Lodging location not set' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenWeather API key not configured' },
        { status: 500 }
      )
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${trip.lodging.lat}&lon=${trip.lodging.lng}&appid=${apiKey}&units=imperial`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('OpenWeather API error')
    }

    const data = await response.json()
    
    // Group forecasts by date and return 7-day forecast
    const forecasts: Record<string, any> = {}
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0]
      if (!forecasts[date]) {
        forecasts[date] = {
          date,
          temp: item.main.temp,
          tempMin: item.main.temp_min,
          tempMax: item.main.temp_max,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          humidity: item.main.humidity,
          windSpeed: item.wind.speed,
        }
      }
    })

    return NextResponse.json({
      location: {
        lat: trip.lodging.lat,
        lng: trip.lodging.lng,
        address: trip.lodging.address,
      },
      forecasts: Object.values(forecasts).slice(0, 7),
    })
  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weather' },
      { status: 500 }
    )
  }
}

