import { NextRequest, NextResponse } from 'next/server'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import {
  parseFlightConfirmationImage,
  parseFlightConfirmationText,
} from '@/lib/trip-flight-parse'

export const dynamic = 'force-dynamic'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

/**
 * POST /api/trip/[tripId]/flights/parse
 * Body JSON: { travelerId, text? }
 * Body multipart: travelerId, text?, file (image)
 * Returns parsed flight rows for review — does not write to DB.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const travelerId = String(form.get('travelerId') ?? '').trim()
      const text = String(form.get('text') ?? '').trim()
      const file = form.get('file')

      if (!travelerId) {
        return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
      }

      const access = await getTripAccess(params.tripId, travelerId)
      if (!access.ok) {
        return NextResponse.json({ error: access.message }, { status: access.status })
      }

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'file is required for image upload' }, { status: 400 })
      }

      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: 'Image must be under 8MB' }, { status: 400 })
      }

      const mimeType = file.type || 'image/jpeg'
      if (!mimeType.startsWith('image/')) {
        return NextResponse.json({ error: 'file must be an image' }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const parsed = await parseFlightConfirmationImage(
        buffer.toString('base64'),
        mimeType,
        text || null
      )

      return NextResponse.json(parsed)
    }

    const body = await request.json().catch(() => ({}))
    const { travelerId, text } = body as { travelerId?: string; text?: string }

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(params.tripId, travelerId.trim())
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    if (typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'text is required (at least 10 characters)' },
        { status: 400 }
      )
    }

    const parsed = await parseFlightConfirmationText(text)
    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Parse failed'
    if (message.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'AI parsing is not configured (missing OPENAI_API_KEY).' },
        { status: 503 }
      )
    }
    if (message.includes('at least 10')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('Flight parse error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
