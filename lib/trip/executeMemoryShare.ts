import { prisma } from '@/lib/prisma'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import {
  getSuggestedCrewEmails,
  mergeRecipientEmails,
} from '@/lib/trip/suggestedCrewEmails'
import {
  buildMemoryShareHtml,
  sendTripMemoryShareEmail,
} from '@/lib/email/sendTripMemoryShare'
import { tripDisplayTitle } from '@/lib/trip/computeTripMetadata'

export type ShareResultItem = {
  email: string
  ok: boolean
  providerMessageId?: string | null
  error?: string
}

export async function executeMemoryShare(input: {
  memoryId: string
  travelerId: string
  recipientEmails?: string[]
  /** Enforces memory.tripId equals this when present (trip-scoped HTTP route). */
  tripIdScope?: string
}): Promise<
  | { ok: true; results: ShareResultItem[] }
  | {
      ok: false
      status: number
      error: string
      invalid?: string[]
      details?: ShareResultItem[]
    }
> {
  const { memoryId, travelerId, recipientEmails, tripIdScope } = input

  const memory = await prisma.tripMemory.findUnique({
    where: { id: memoryId },
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
      author: {
        select: { firstName: true, lastName: true, email: true },
      },
      trip: {
        select: {
          id: true,
          purpose: true,
          city: true,
          state: true,
          country: true,
          crewId: true,
        },
      },
    },
  })

  if (!memory) {
    return { ok: false, status: 404, error: 'Memory not found' }
  }

  if (tripIdScope && memory.tripId !== tripIdScope) {
    return { ok: false, status: 404, error: 'Memory not found' }
  }

  if (memory.tripId) {
    const access = await getTripAccess(memory.tripId, travelerId)
    if (!access.ok) {
      return { ok: false, status: access.status, error: access.message }
    }
  }

  if (memory.authorTravelerId !== travelerId) {
    return { ok: false, status: 403, error: 'Only the author can share this memory' }
  }

  const hasText = memory.body.trim().length > 0
  const hasPhotos = memory.photos.length > 0
  if (!hasText && !hasPhotos) {
    return {
      ok: false,
      status: 400,
      error: 'Add a reflection or at least one photo before sharing',
    }
  }

  const senderEmailLower = memory.author.email?.trim().toLowerCase() ?? null

  let crewSuggestions: string[] = []
  if (memory.tripId) {
    crewSuggestions = await getSuggestedCrewEmails(memory.tripId, travelerId)
  }

  if (
    memory.tripId &&
    memory.trip &&
    !memory.trip.crewId &&
    (!recipientEmails || recipientEmails.length === 0) &&
    crewSuggestions.length === 0
  ) {
    return {
      ok: false,
      status: 400,
      error:
        'This trip has no crew. Add recipient email addresses, or assign the trip to a TripCrew.',
    }
  }

  if (
    !memory.tripId &&
    (!recipientEmails || recipientEmails.length === 0) &&
    crewSuggestions.length === 0
  ) {
    return {
      ok: false,
      status: 400,
      error: 'Add at least one recipient email for standalone memories.',
    }
  }

  const { emails, invalid } = mergeRecipientEmails(
    crewSuggestions,
    recipientEmails,
    senderEmailLower
  )

  if (invalid.length > 0) {
    return { ok: false, status: 400, error: 'Invalid email addresses', invalid }
  }

  if (emails.length === 0) {
    return {
      ok: false,
      status: 400,
      error:
        'No recipients. Add crew members with email, or pass recipientEmails.',
    }
  }

  let tripLabel: string
  let tripUrl: string
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

  if (memory.tripId && memory.trip) {
    tripLabel =
      tripDisplayTitle(memory.trip.purpose) ||
      [memory.trip.city, memory.trip.state, memory.trip.country].filter(Boolean).join(', ') ||
      'Your trip'
    tripUrl = base ? `${base}/trip/${memory.tripId}` : `/trip/${memory.tripId}`
  } else {
    const place = [
      memory.freestyleCity,
      memory.freestyleState,
      memory.freestyleCountry,
    ]
      .filter(Boolean)
      .join(', ')
    tripLabel =
      (memory.freestyleTitle?.trim() || place) || 'Trip memory'
    tripUrl = base ? `${base}/memories` : '/memories'
  }

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

  const results: ShareResultItem[] = []

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
    return {
      ok: false,
      status: 502,
      error: 'Failed to send email',
      details: results,
    }
  }

  return { ok: true, results }
}
