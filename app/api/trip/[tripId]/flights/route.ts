import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import {
  flightRowHasData,
  formRowToDbData,
  type TripFlightFormRow,
} from '@/lib/trip-flight'
import { shouldRejectEmptyFlightReplace } from '@/lib/trip-flight-save-guard'
import type { TripFlightDirection } from '@prisma/client'

export const dynamic = 'force-dynamic'

const DIRECTIONS: TripFlightDirection[] = ['OUTBOUND', 'RETURN', 'OTHER']

function normDirection(v: unknown): TripFlightDirection {
  if (typeof v === 'string' && DIRECTIONS.includes(v as TripFlightDirection)) {
    return v as TripFlightDirection
  }
  return 'OTHER'
}

function rowFromBody(raw: unknown, fallbackDirection: TripFlightDirection): TripFlightFormRow {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    id: typeof o.id === 'string' ? o.id : undefined,
    direction: normDirection(o.direction ?? fallbackDirection),
    airlineName: typeof o.airlineName === 'string' ? o.airlineName : '',
    airlineCode: typeof o.airlineCode === 'string' ? o.airlineCode : '',
    flightNumber: typeof o.flightNumber === 'string' ? o.flightNumber : '',
    departureAirportCode:
      typeof o.departureAirportCode === 'string' ? o.departureAirportCode : '',
    arrivalAirportCode:
      typeof o.arrivalAirportCode === 'string' ? o.arrivalAirportCode : '',
    departureTime: typeof o.departureTime === 'string' ? o.departureTime : '',
    arrivalTime: typeof o.arrivalTime === 'string' ? o.arrivalTime : '',
    durationMinutes:
      typeof o.durationMinutes === 'number' && Number.isFinite(o.durationMinutes)
        ? Math.round(o.durationMinutes)
        : null,
    confirmationCode: typeof o.confirmationCode === 'string' ? o.confirmationCode : '',
    notes: typeof o.notes === 'string' ? o.notes : '',
  }
}

function toDbData(row: TripFlightFormRow, sortOrder: number) {
  return formRowToDbData(row, sortOrder)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const travelerId = searchParams.get('travelerId')?.trim()
    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(params.tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const flights = await prisma.tripFlight.findMany({
      where: { tripId: params.tripId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ flights })
  } catch (error) {
    console.error('Flights list error:', error)
    return NextResponse.json({ error: 'Failed to list flights' }, { status: 500 })
  }
}

/** Upsert structured flight legs for a trip (replaces non-legacy flight rows). */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}))
    const { travelerId, flights: flightsRaw, travelNotes, clearFlights } = body as {
      travelerId?: string
      flights?: unknown[]
      travelNotes?: string | null
      clearFlights?: boolean
    }

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(params.tripId, travelerId.trim())
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const incomingRows = Array.isArray(flightsRaw)
      ? flightsRaw.map((row, index) =>
          rowFromBody(
            row,
            index === 0 ? 'OUTBOUND' : index === 1 ? 'RETURN' : 'OTHER'
          )
        )
      : []

    const rowsToSave = incomingRows.filter(flightRowHasData)

    if (shouldRejectEmptyFlightReplace(rowsToSave, clearFlights === true)) {
      const existing = await prisma.tripFlight.findMany({
        where: { tripId: params.tripId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })
      return NextResponse.json({
        flights: existing,
        skippedEmptyReplace: true,
      })
    }

    const saved = await prisma.$transaction(async (tx) => {
      await tx.tripFlight.deleteMany({ where: { tripId: params.tripId } })

      const results = []
      for (let i = 0; i < rowsToSave.length; i++) {
        const row = rowsToSave[i]
        const created = await tx.tripFlight.create({
          data: {
            tripId: params.tripId,
            ...toDbData(row, i),
          },
        })
        results.push(created)
      }

      const notesExisting = await tx.logisticItem.findFirst({
        where: {
          tripId: params.tripId,
          title: { equals: 'Travel notes', mode: 'insensitive' },
        },
      })

      const notesValue =
        typeof travelNotes === 'string' ? travelNotes.trim() : ''

      if (notesValue) {
        if (notesExisting) {
          await tx.logisticItem.update({
            where: { id: notesExisting.id },
            data: { detail: notesValue },
          })
        } else {
          await tx.logisticItem.create({
            data: {
              tripId: params.tripId,
              title: 'Travel notes',
              detail: notesValue,
            },
          })
        }
      } else if (notesExisting) {
        await tx.logisticItem.delete({ where: { id: notesExisting.id } })
      }

      return results
    })

    return NextResponse.json({ flights: saved })
  } catch (error) {
    console.error('Flights upsert error:', error)
    return NextResponse.json({ error: 'Failed to save flights' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const travelerId = searchParams.get('travelerId')?.trim()
    const id = searchParams.get('id')?.trim()

    if (!travelerId || !id) {
      return NextResponse.json(
        { error: 'travelerId and id are required' },
        { status: 400 }
      )
    }

    const access = await getTripAccess(params.tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const flight = await prisma.tripFlight.findFirst({
      where: { id, tripId: params.tripId },
    })
    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 })
    }

    await prisma.tripFlight.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Flight delete error:', error)
    return NextResponse.json({ error: 'Failed to delete flight' }, { status: 500 })
  }
}
