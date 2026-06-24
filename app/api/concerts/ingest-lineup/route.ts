import { NextRequest, NextResponse } from 'next/server'
import { parseConcertLineupBlobWithOpenAI } from '@/lib/concert-lineup-ingest'

export const dynamic = 'force-dynamic'

/**
 * POST /api/concerts/ingest-lineup
 * Body: { blob: string }
 * Returns draft ConcertInfoIngest JSON — no database writes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const blob = typeof body.blob === 'string' ? body.blob : ''

    if (blob.trim().length < 20) {
      return NextResponse.json(
        { error: 'Paste at least 20 characters of festival or concert text' },
        { status: 400 }
      )
    }

    const draft = await parseConcertLineupBlobWithOpenAI(blob)
    return NextResponse.json({ draft })
  } catch (error) {
    console.error('Concert ingest-lineup error:', error)
    const message = error instanceof Error ? error.message : 'Failed to parse concert text'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
