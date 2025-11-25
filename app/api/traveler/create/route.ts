import { NextRequest, NextResponse } from 'next/server'
import { TravelerFindOrCreateService } from '@/lib/services/TravelerFindOrCreateService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/traveler/create
 * 
 * Find or create Traveler by Firebase ID
 * Pattern matches GoFast's /api/athlete/create route
 * 
 * Request body:
 * {
 *   firebaseId: string (required)
 *   email?: string
 *   displayName?: string
 *   picture?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firebaseId, email, displayName, picture } = body

    if (!firebaseId) {
      return NextResponse.json(
        {
          success: false,
          error: 'firebaseId is required',
        },
        { status: 400 }
      )
    }

    console.log('🔐 TRAVELER CREATE: firebaseId:', firebaseId)
    console.log('🔐 TRAVELER CREATE: email:', email)
    console.log('🔐 TRAVELER CREATE: displayName:', displayName)

    // Call service to find or create traveler (upserts all Firebase data)
    const traveler = await TravelerFindOrCreateService.findOrCreate({
      firebaseId,
      email,
      displayName,
      picture,
    })

    // Format response
    const response = TravelerFindOrCreateService.formatResponse(traveler)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('❌ TRAVELER CREATE error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create or find traveler',
      },
      { status: 500 }
    )
  }
}

