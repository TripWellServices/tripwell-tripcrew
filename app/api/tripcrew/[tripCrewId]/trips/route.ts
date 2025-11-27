import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * This API route is deprecated - use server actions instead
 * @deprecated Use upsertTrip from @/lib/actions/trip instead
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tripCrewId: string } }
) {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use server actions instead.' },
    { status: 410 }
  )
}
