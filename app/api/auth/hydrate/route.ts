import { NextRequest, NextResponse } from 'next/server'
import { TravelerFindOrCreateService } from '@/lib/services/TravelerFindOrCreateService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/hydrate?firebaseId=...
 * Lightweight hydrate when the client only has Firebase uid (e.g. after client nav).
 * Same traveler payload as POST; optional email/name/picture are omitted.
 */
export async function GET(request: NextRequest) {
  try {
    const firebaseId = request.nextUrl.searchParams.get('firebaseId')
    if (!firebaseId?.trim()) {
      return NextResponse.json(
        { error: 'Firebase ID required' },
        { status: 400 }
      )
    }

    const traveler = await TravelerFindOrCreateService.findOrCreate({
      firebaseId: firebaseId.trim(),
    })

    return NextResponse.json({
      success: true,
      traveler,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to hydrate user'
    console.error('Hydrate GET error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/auth/hydrate
 *
 * Hydrate Traveler from Firebase auth
 * Uses TravelerFindOrCreateService to find or create traveler
 * Links to TripWell Enterprises master container
 */
export async function POST(request: NextRequest) {
  try {
    const { firebaseId, email, name, picture } = await request.json()

    if (!firebaseId) {
      return NextResponse.json(
        { error: 'Firebase ID required' },
        { status: 400 }
      )
    }

    // Use service to find or create traveler (handles TripWell Enterprises linking)
    const traveler = await TravelerFindOrCreateService.findOrCreate({
      firebaseId,
      email,
      displayName: name,
      picture,
    })

    return NextResponse.json({
      success: true,
      traveler,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to hydrate user'
    console.error('Hydrate error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

