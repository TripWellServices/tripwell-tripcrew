import { NextRequest, NextResponse } from 'next/server'
import { parseTripPlanBlobWithOpenAI } from '@/lib/trip-plan-parse'

export const dynamic = 'force-dynamic'

/**
 * POST /api/plan/parse-blob
 * Body: { blob: string }
 * Returns { parsed: ParsedTripPlan } — does not write to DB.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const blob = typeof body.blob === 'string' ? body.blob : ''

    if (blob.trim().length < 20) {
      return NextResponse.json(
        {
          error:
            'blob is required (at least 20 characters). Paste itinerary or confirmation details.',
        },
        { status: 400 }
      )
    }

    const parsed = await parseTripPlanBlobWithOpenAI(blob)
    return NextResponse.json({ success: true, parsed })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Parse failed'
    if (message.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'AI parsing is not configured (missing OPENAI_API_KEY).' },
        { status: 503 }
      )
    }
    if (message.includes('at least 20')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('Plan parse-blob error:', error)
    return NextResponse.json(
      {
        error:
          message === 'AI parsing failed' ? 'AI parsing failed' : message,
      },
      { status: 500 }
    )
  }
}
