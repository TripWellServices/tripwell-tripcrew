import { NextRequest, NextResponse } from 'next/server'
import { resolveTripWellEnterpriseId } from '@/config/tripWellEnterpriseConfig'
import { prisma } from '@/lib/prisma'
import { buildAttractionsFromLodgingDrafts } from '@/lib/lodging-build-attractions'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import { nearbyDraftsFromJson } from '@/lib/trip-lodging-parse'

export const dynamic = 'force-dynamic'

/**
 * POST /api/trip/[tripId]/lodging/build-attractions
 * Body: { travelerId, draftKeys?: string[] }
 * Builds unscheduled Attraction rows from saved nearbyAttractionDrafts on the trip lodging.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}))
    const travelerId = typeof body.travelerId === 'string' ? body.travelerId.trim() : ''
    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(params.tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const lodging = await prisma.lodging.findUnique({
      where: { tripId: params.tripId },
    })
    if (!lodging) {
      return NextResponse.json({ error: 'Save lodging before building attractions' }, { status: 404 })
    }

    const drafts = nearbyDraftsFromJson(lodging.nearbyAttractionDrafts)
    if (!drafts.length) {
      return NextResponse.json({ error: 'No nearby activity drafts on this stay' }, { status: 400 })
    }

    const draftKeys = Array.isArray(body.draftKeys)
      ? body.draftKeys.filter((k: unknown): k is string => typeof k === 'string' && Boolean(k.trim()))
      : drafts.map((d) => d.draftKey)

    const result = await buildAttractionsFromLodgingDrafts({
      tripId: params.tripId,
      travelerId,
      enterpriseId: resolveTripWellEnterpriseId(undefined),
      drafts,
      selectedDraftKeys: draftKeys,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('lodging build-attractions error:', error)
    return NextResponse.json({ error: 'Failed to build attractions' }, { status: 500 })
  }
}
