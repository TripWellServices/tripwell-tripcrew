import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params

    const destinations = await prisma.destination.findMany({
      where: { tripId },
      orderBy: { order: 'asc' },
      include: { city: true },
    })

    return NextResponse.json(destinations)
  } catch (error) {
    console.error('Destinations list error:', error)
    return NextResponse.json(
      { error: 'Failed to list destinations' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params
    const body = await request.json()
    const { cityId, name, state, country, order } = body

    if (!cityId) {
      return NextResponse.json(
        { error: 'cityId is required' },
        { status: 400 }
      )
    }

    const trip = await prisma.trip.findUnique({ where: { id: tripId } })
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const city = await prisma.city.findUnique({ where: { id: cityId } })
    if (!city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 })
    }

    const destination = await prisma.destination.create({
      data: {
        tripId,
        cityId,
        name: name?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || null,
        order: typeof order === 'number' ? order : 0,
      },
      include: { city: true },
    })

    return NextResponse.json(destination)
  } catch (error) {
    console.error('Destination create error:', error)
    return NextResponse.json(
      { error: 'Failed to create destination' },
      { status: 500 }
    )
  }
}
