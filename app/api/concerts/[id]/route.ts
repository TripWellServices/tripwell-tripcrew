import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { concertPatchData } from '@/lib/concert-api-fields'
import { resolveConcertCityId } from '@/lib/concert-city-resolve'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const concert = await prisma.concert.findUnique({
      where: { id },
      include: {
        city: true,
        scheduleItems: { orderBy: { sortOrder: 'asc' } },
      },
    })
    if (!concert) {
      return NextResponse.json({ error: 'Concert not found' }, { status: 404 })
    }
    return NextResponse.json(concert)
  } catch (error) {
    console.error('Concert fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch concert' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.concert.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Concert not found' }, { status: 404 })
    }

    const data = concertPatchData(body, existing)

    if (
      body.cityId !== undefined ||
      body.city !== undefined ||
      body.state !== undefined ||
      body.country !== undefined
    ) {
      const resolvedCityId = await resolveConcertCityId({
        cityId: body.cityId,
        city: body.city,
        state: body.state,
        country: body.country,
      })
      if (body.cityId?.trim() && !resolvedCityId) {
        return NextResponse.json({ error: 'City not found' }, { status: 404 })
      }
      if (
        body.cityId !== undefined ||
        body.city !== undefined ||
        body.state !== undefined ||
        body.country !== undefined
      ) {
        data.city = resolvedCityId
          ? { connect: { id: resolvedCityId } }
          : { disconnect: true }
      }
    }

    const updated = await prisma.concert.update({
      where: { id },
      data,
      include: {
        city: true,
        scheduleItems: { orderBy: { sortOrder: 'asc' } },
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Concert update error:', error)
    return NextResponse.json(
      { error: 'Failed to update concert' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await prisma.concert.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Concert not found' }, { status: 404 })
    }
    await prisma.concert.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Concert delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete concert' },
      { status: 500 }
    )
  }
}
