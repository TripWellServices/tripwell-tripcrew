/**
 * GET /api/tripcrew?travelerId=xxx
 * 
 * Get all TripCrews for a traveler
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTravelerTripCrews } from '@/lib/actions/tripcrew'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const travelerId = searchParams.get('travelerId')

    if (!travelerId) {
      return NextResponse.json(
        { error: 'travelerId is required' },
        { status: 400 }
      )
    }

    const result = await getTravelerTripCrews(travelerId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        tripCrews: result.tripCrews,
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to get TripCrews' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Get TripCrews error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get TripCrews' },
      { status: 500 }
    )
  }
}

