import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { wishlistIdForTraveler } from '@/lib/traveler-build-scope'
import { resolveConcertCreateData } from '@/lib/concert-api-fields'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get('cityId')
    const travelerId = searchParams.get('travelerId')?.trim()
    const savedByTravelerId = searchParams.get('savedByTravelerId')?.trim()

    if (travelerId) {
      const wId = await wishlistIdForTraveler(travelerId)
      const concerts = await prisma.concert.findMany({
        where: {
          OR: [
            { savedByTravelerId: travelerId },
            { createdById: travelerId },
            ...(wId ? [{ wishlistId: wId }] : []),
          ],
        },
        orderBy: [{ eventStartDate: 'asc' }, { eventDate: 'asc' }, { name: 'asc' }],
        include: { city: true, scheduleItems: { orderBy: { sortOrder: 'asc' } } },
      })
      return NextResponse.json({ concerts })
    }

    if (savedByTravelerId) {
      const concerts = await prisma.concert.findMany({
        where: { savedByTravelerId },
        orderBy: [{ eventStartDate: 'asc' }, { eventDate: 'asc' }, { name: 'asc' }],
        include: { city: true, scheduleItems: { orderBy: { sortOrder: 'asc' } } },
      })
      return NextResponse.json({ concerts })
    }

    const concerts = await prisma.concert.findMany({
      where: cityId ? { cityId } : undefined,
      orderBy: [{ eventStartDate: 'asc' }, { eventDate: 'asc' }, { name: 'asc' }],
      include: { city: true, scheduleItems: { orderBy: { sortOrder: 'asc' } } },
    })

    return NextResponse.json(concerts)
  } catch (error) {
    console.error('Concerts list error:', error)
    return NextResponse.json(
      { error: 'Failed to list concerts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const resolved = await resolveConcertCreateData(body)
    if ('error' in resolved) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status }
      )
    }

    const { data, scheduleItems } = resolved
    const createData: Prisma.ConcertUncheckedCreateInput = {
      ...data,
      scheduleItems: scheduleItems.length
        ? {
            create: scheduleItems.map((item) => ({
              title: item.title,
              artist: item.artist,
              stage: item.stage,
              location: item.location,
              date: item.date,
              startTime: item.startTime,
              endTime: item.endTime,
              notes: item.notes,
              sortOrder: item.sortOrder,
            })),
          }
        : undefined,
    }
    const concert = await prisma.concert.create({
      data: createData,
      include: {
        city: true,
        scheduleItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(concert)
  } catch (error) {
    console.error('Concert create error:', error)
    return NextResponse.json(
      { error: 'Failed to create concert' },
      { status: 500 }
    )
  }
}
