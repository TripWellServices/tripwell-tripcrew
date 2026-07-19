import { NextRequest, NextResponse } from 'next/server'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import {
  parseLodgingConfirmationImage,
  parseLodgingConfirmationText,
} from '@/lib/trip-lodging-parse'

export const dynamic = 'force-dynamic'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024

/**
 * POST /api/trip/[tripId]/lodging/parse
 * Body JSON: { travelerId, text? }
 * Body multipart: travelerId, text?, file (image)
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
      const parsed = await parseLodgingConfirmationImage(
        buffer.toString('base64'),
        mimeType,
        text || null
      )
      return NextResponse.json(parsed)
    }

    const body = await request.json().catch(() => ({}))
    const travelerId = typeof body.travelerId === 'string' ? body.travelerId.trim() : ''
    const text = typeof body.text === 'string' ? body.text : ''

    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(params.tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const parsed = await parseLodgingConfirmationText(text)
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
    console.error('lodging parse error:', error)
    return NextResponse.json({ error: message === 'AI parsing failed' ? message : message }, {
      status: 500,
    })
  }
}
