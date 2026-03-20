import { NextRequest, NextResponse } from 'next/server'
import { parseHikeDescriptionWithOpenAI } from '@/lib/hike-parse'

export const dynamic = 'force-dynamic'

/**
 * POST /api/hikes/parse
 * Body: { regionHint?: string, pastedDescription: string }
 * Returns { parsed: HikeParseResult } — does not write to DB.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const regionHint =
      typeof body.regionHint === 'string' ? body.regionHint.trim() : ''
    const pastedDescription =
      typeof body.pastedDescription === 'string'
        ? body.pastedDescription.trim()
        : ''

    if (pastedDescription.length < 20) {
      return NextResponse.json(
        {
          error:
            'pastedDescription is required (at least 20 characters). Paste from AllTrails or describe the trail.',
        },
        { status: 400 }
      )
    }

    const parsed = await parseHikeDescriptionWithOpenAI(
      regionHint || undefined,
      pastedDescription
    )
    return NextResponse.json({ parsed })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Parse failed'
    if (message.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'AI parsing is not configured (missing OPENAI_API_KEY).' },
        { status: 503 }
      )
    }
    console.error('Hike parse error:', error)
    return NextResponse.json(
      { error: message === 'AI parsing failed' ? 'AI parsing failed' : message },
      { status: 500 }
    )
  }
}
