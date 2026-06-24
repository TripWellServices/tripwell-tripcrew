import { NextRequest, NextResponse } from 'next/server'
import { resolveTripWellEnterpriseId } from '@/config/tripWellEnterpriseConfig'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Create an adventure artifact (reusable or trip-scoped). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tripId,
      cityId,
      name,
      category,
      durationMin,
      url,
      imageUrl,
      notes,
      createdById,
    } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const adventure = await prisma.adventure.create({
      data: {
        tripId: tripId?.trim() || null,
        cityId: cityId?.trim() || null,
        name: name.trim(),
        category: category?.trim() || null,
        durationMin: typeof durationMin === 'number' ? Math.round(durationMin) : null,
        url: url?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        notes: notes?.trim() || null,
        createdById: createdById?.trim() || null,
      },
    })

    return NextResponse.json(adventure)
  } catch (error) {
    console.error('Adventure create error:', error)
    return NextResponse.json({ error: 'Failed to create adventure' }, { status: 500 })
  }
}

/** List adventures filtered by tripId. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')?.trim()

    const adventures = await prisma.adventure.findMany({
      where: {
        ...(tripId && { tripId }),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ adventures })
  } catch (error) {
    console.error('Adventure list error:', error)
    return NextResponse.json({ error: 'Failed to list adventures' }, { status: 500 })
  }
}
