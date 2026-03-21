import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listSavedExperiencesForPlan } from '@/lib/plan-saved-experiences'

export const dynamic = 'force-dynamic'

interface RouteParams { params: Promise<{ planId: string }> }

/**
 * GET /api/plan/[planId]
 * Returns a single plan with trips and saved experiences.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId } = await params

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        trips: {
          orderBy: { startDate: 'asc' },
          select: {
            id: true,
            tripName: true,
            dateRange: true,
            tripScope: true,
            status: true,
          },
        },
        tripCrew: { select: { id: true, name: true } },
      },
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const savedExperiences = await listSavedExperiencesForPlan(planId)

    return NextResponse.json({
      plan: {
        ...plan,
        savedExperiences,
      },
    })
  } catch (error) {
    console.error('Plan get error:', error)
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 })
  }
}

/**
 * PATCH /api/plan/[planId]
 * Body: { name?, season?, tripCrewId? }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId } = await params
    const body = await request.json().catch(() => ({}))
    const { name, season, tripCrewId } = body

    const plan = await prisma.plan.update({
      where: { id: planId },
      data: {
        ...(name !== undefined && { name: name?.trim() ?? undefined }),
        ...(season !== undefined && { season: season?.trim() ?? null }),
        ...(tripCrewId !== undefined && { tripCrewId: tripCrewId ?? null }),
      },
    })

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Plan patch error:', error)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}

/**
 * DELETE /api/plan/[planId]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { planId } = await params

    await prisma.plan.delete({ where: { id: planId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Plan delete error:', error)
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}
