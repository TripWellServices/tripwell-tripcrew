import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { HIKE_ROUTE_TYPES, type HikeRouteType } from '@/lib/hike-model'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const hike = await prisma.hike.findUnique({
      where: { id },
      include: {
        city: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
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
      routeType,
      trailheadLat,
      trailheadLng,
      nearestTown,
      sourcePaste,
      url,
      notes,
      createdById,
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
    if (routeType !== undefined) {
      const rt = typeof routeType === 'string' ? routeType.trim() : ''
      data.routeType =
        rt && HIKE_ROUTE_TYPES.includes(rt as HikeRouteType) ? rt : null
    }
    if (trailheadLat !== undefined)
      data.trailheadLat =
        typeof trailheadLat === 'number' && Number.isFinite(trailheadLat)
          ? trailheadLat
          : null
    if (trailheadLng !== undefined)
      data.trailheadLng =
        typeof trailheadLng === 'number' && Number.isFinite(trailheadLng)
          ? trailheadLng
          : null
    if (nearestTown !== undefined)
      data.nearestTown = nearestTown?.trim() || null
    if (sourcePaste !== undefined)
      data.sourcePaste = sourcePaste?.trim() || null
    if (url !== undefined) data.url = url?.trim() || null
    if (notes !== undefined) data.notes = notes?.trim() || null

    if (createdById !== undefined) {
      const nextAuthor =
        typeof createdById === 'string' && createdById.trim() ? createdById.trim() : null
      if (existing.createdById && nextAuthor && existing.createdById !== nextAuthor) {
        return NextResponse.json(
          { error: 'Hike already has an author' },
          { status: 409 }
        )
      }
      if (!existing.createdById && nextAuthor) {
        data.createdById = nextAuthor
      }
    }

    const updated = await prisma.hike.update({
      where: { id },
      data,
      include: {
        city: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
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
