import { NextRequest, NextResponse } from 'next/server'
import { TravelerFindOrCreateService } from '@/lib/services/TravelerFindOrCreateService'
import { requireTravelerFromBearer } from '@/lib/auth/requireTravelerFromBearer'
import { ensureWishlistForTraveler } from '@/lib/ensure-wishlist'

export const dynamic = 'force-dynamic'

/**
 * GET/POST /api/auth/hydrate
 *
 * Same session model as GoFast POST `/api/athlete/hydrate`: requires
 * `Authorization: Bearer <Firebase ID token>` and `x-traveler-id` (PK).
 * Identity is verified by matching JWT uid to the traveler row.
 */
async function hydrate(request: NextRequest) {
  const authR = await requireTravelerFromBearer(request)
  if ('error' in authR) {
    return NextResponse.json(
      { success: false, error: authR.error },
      { status: authR.status }
    )
  }

  const traveler = await TravelerFindOrCreateService.getHydratedById(
    authR.traveler.id
  )
  if (!traveler) {
    return NextResponse.json(
      { success: false, error: 'Traveler not found' },
      { status: 404 }
    )
  }

  await ensureWishlistForTraveler(traveler.id).catch(() => {})

  return NextResponse.json({
    success: true,
    message: 'Traveler hydrated successfully',
    traveler,
    timestamp: new Date().toISOString(),
  })
}

export async function GET(request: NextRequest) {
  try {
    return await hydrate(request)
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to hydrate user'
    console.error('Hydrate GET error:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await hydrate(request)
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to hydrate user'
    console.error('Hydrate error:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
