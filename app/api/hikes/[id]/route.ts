import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const hike = await prisma.hike.findUnique({
      where: { id },
      include: { city: true },
    })
    if (!hike) {
      return NextResponse.json({ error: 'Hike not found' }, { status: 404 })
    }
    return NextResponse.json(hike)
  } catch (error) {
    console.error('Hike fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hike' },
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
    const {
      name,
      trailOrPlace,
      cityId,
      difficulty,
      distanceMi,
      durationMin,
      url,
      notes,
    } = body

    const existing = await prisma.hike.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Hike not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name?.trim() ?? existing.name
    if (trailOrPlace !== undefined)
      data.trailOrPlace = trailOrPlace?.trim() || null
    if (cityId !== undefined) data.cityId = cityId || null
    if (difficulty !== undefined) data.difficulty = difficulty?.trim() || null
    if (distanceMi !== undefined)
      data.distanceMi =
        typeof distanceMi === 'number' && Number.isFinite(distanceMi)
          ? distanceMi
          : null
    if (durationMin !== undefined)
      data.durationMin =
        typeof durationMin === 'number' && Number.isFinite(durationMin)
          ? Math.round(durationMin)
          : null
    if (url !== undefined) data.url = url?.trim() || null
    if (notes !== undefined) data.notes = notes?.trim() || null

    const updated = await prisma.hike.update({
      where: { id },
      data,
      include: { city: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Hike update error:', error)
    return NextResponse.json(
      { error: 'Failed to update hike' },
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
    const existing = await prisma.hike.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Hike not found' }, { status: 404 })
    }
    await prisma.hike.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Hike delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete hike' },
      { status: 500 }
    )
  }
}
