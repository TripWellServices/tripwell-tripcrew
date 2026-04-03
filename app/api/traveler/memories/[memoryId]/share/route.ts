import { NextRequest, NextResponse } from 'next/server'
import { executeMemoryShare } from '@/lib/trip/executeMemoryShare'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  try {
    const { memoryId } = await params
    const body = await request.json().catch(() => ({}))
    const { travelerId, recipientEmails } = body as {
      travelerId?: string
      recipientEmails?: string[]
    }

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const result = await executeMemoryShare({
      memoryId,
      travelerId,
      recipientEmails,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.invalid ? { invalid: result.invalid } : {}),
          ...(result.details ? { details: result.details } : {}),
        },
        { status: result.status }
      )
    }

    return NextResponse.json({ ok: true, results: result.results })
  } catch (error) {
    console.error('Traveler memory share error:', error)
    return NextResponse.json({ error: 'Failed to share memory' }, { status: 500 })
  }
}
