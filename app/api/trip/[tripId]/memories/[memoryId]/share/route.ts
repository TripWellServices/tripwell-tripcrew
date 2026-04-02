import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import {
  buildMemoryShareHtml,
  sendTripMemoryShareEmail,
} from '@/lib/email/sendTripMemoryShare'
import {
  getSuggestedCrewEmails,
  mergeRecipientEmails,
} from '@/lib/trip/suggestedCrewEmails'
import { tripDisplayTitle } from '@/lib/trip/computeTripMetadata'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; memoryId: string }> }
) {
  try {
    const { tripId, memoryId } = await params
    const body = await request.json().catch(() => ({}))
    const { travelerId, recipientEmails } = body as {
      travelerId?: string
      recipientEmails?: string[]
    }

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const memory = await prisma.tripMemory.findFirst({
      where: { id: memoryId, tripId },
      include: {
        photos: { orderBy: { sortOrder: 'asc' } },
        author: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    })

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    if (memory.authorTravelerId !== travelerId) {
      return NextResponse.json(
        { error: 'Only the author can share this memory' },
        { status: 403 }
      )
    }

    const hasText = memory.body.trim().length > 0
    const hasPhotos = memory.photos.length > 0
    if (!hasText && !hasPhotos) {
      return NextResponse.json(
        { error: 'Add a reflection or at least one photo before sharing' },
        { status: 400 }
      )
    }

    const crewSuggestions = await getSuggestedCrewEmails(tripId, travelerId)
    const senderEmailLower = memory.author.email?.trim().toLowerCase() ?? null

    if (!access.trip.crewId && (!recipientEmails || recipientEmails.length === 0)) {
      return NextResponse.json(
        {
          error:
            'This trip has no crew. Add recipient email addresses, or assign the trip to a TripCrew.',
        },
        { status: 400 }
      )
    }

    const { emails, invalid } = mergeRecipientEmails(
      crewSuggestions,
      recipientEmails,
      senderEmailLower
    )

    if (invalid.length > 0) {
      return NextResponse.json(
        { error: 'Invalid email addresses', invalid },
        { status: 400 }
      )
    }

    if (emails.length === 0) {
      return NextResponse.json(
        {
          error:
            'No recipients. Add crew members with email, or pass recipientEmails for solo trips.',
        },
        { status: 400 }
      )
    }

    const tripLabel =
      tripDisplayTitle(access.trip.purpose) ||
      [access.trip.city, access.trip.state, access.trip.country].filter(Boolean).join(', ') ||
      'Your trip'

    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    const tripUrl = base ? `${base}/trip/${tripId}` : `/trip/${tripId}`

    const authorName =
      [memory.author.firstName, memory.author.lastName].filter(Boolean).join(' ').trim() ||
      'Someone'

    const excerpt =
      memory.body.trim().slice(0, 2000) + (memory.body.length > 2000 ? '…' : '')

    const html = buildMemoryShareHtml({
      authorLine: authorName,
      tripLabel,
      tripUrl,
      bodyExcerpt: excerpt || '(Photos only)',
      photoUrls: memory.photos.map((p) => p.publicUrl),
    })

    const subject = `${authorName} shared a memory: ${tripLabel}`

    const results: {
      email: string
      ok: boolean
      providerMessageId?: string | null
      error?: string
    }[] = []

    for (const to of emails) {
      const send = await sendTripMemoryShareEmail({ to, subject, html })
      if (send.error && !send.providerMessageId) {
        results.push({ email: to, ok: false, error: send.error })
        continue
      }
      await prisma.tripMemoryShare.create({
        data: {
          memoryId,
          sentByTravelerId: travelerId,
          recipientEmail: to,
          providerMessageId: send.providerMessageId,
        },
      })
      results.push({ email: to, ok: true, providerMessageId: send.providerMessageId })
    }

    const failed = results.filter((r) => !r.ok)
    if (failed.length === results.length) {
      return NextResponse.json(
        { error: 'Failed to send email', details: failed },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, results })
  } catch (error) {
    console.error('Memory share POST error:', error)
    return NextResponse.json({ error: 'Failed to share memory' }, { status: 500 })
  }
}
