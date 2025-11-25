import { NextRequest, NextResponse } from 'next/server'
import { TravelerFindOrCreateService } from '@/lib/services/TravelerFindOrCreateService'

export const dynamic = 'force-dynamic'

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
  } catch (error: any) {
    console.error('Hydrate error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to hydrate user' },
      { status: 500 }
    )
  }
}

