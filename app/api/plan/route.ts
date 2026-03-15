import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/plan?travelerId=xxx
 * Returns all plans for the traveler, with trip and wishlist counts.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const travelerId = searchParams.get('travelerId')

    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const plans = await prisma.plan.findMany({
      where: { travelerId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { trips: true, wishlistItems: true },
        },
        tripCrew: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Plan list error:', error)
    return NextResponse.json({ error: 'Failed to list plans' }, { status: 500 })
  }
}

/**
 * POST /api/plan
 * Body: { travelerId, name, season?, tripCrewId? }
 * Creates a new Plan.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { travelerId, name, season, tripCrewId } = body

    if (!travelerId || !name?.trim()) {
      return NextResponse.json({ error: 'travelerId and name are required' }, { status: 400 })
    }

    const plan = await prisma.plan.create({
      data: {
        travelerId,
        name: name.trim(),
        season: season?.trim() ?? null,
        tripCrewId: tripCrewId ?? null,
      },
    })

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    console.error('Plan create error:', error)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}
