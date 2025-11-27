import { NextRequest, NextResponse } from 'next/server'
import { createTripCrew } from '@/lib/actions/tripcrew'

export const dynamic = 'force-dynamic'

/**
 * Create TripCrew API Route
 * @deprecated Use createTripCrew server action directly instead
 */
export async function POST(request: NextRequest) {
  try {
    const { name, travelerId } = await request.json()

    if (!name || !travelerId) {
      return NextResponse.json(
        { error: 'Name and travelerId are required' },
        { status: 400 }
      )
    }

    // Use server action
    const result = await createTripCrew({ name, travelerId })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create TripCrew' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tripCrew: result.tripCrew,
    })
  } catch (error) {
    console.error('Create TripCrew error:', error)
    return NextResponse.json(
      { error: 'Failed to create TripCrew' },
      { status: 500 }
    )
  }
}
