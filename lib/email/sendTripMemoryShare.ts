import { Resend } from 'resend'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export function getMemoryShareFromAddress(): string | null {
  const from = process.env.TRIPWELL_EMAIL_FROM?.trim()
  return from || null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildMemoryShareHtml(input: {
  authorLine: string
  tripLabel: string
  tripUrl: string
  bodyExcerpt: string
  photoUrls: string[]
}): string {
  const photos =
    input.photoUrls.length > 0
      ? `<ul style="padding-left:18px;">${input.photoUrls
          .map(
            (u) =>
              `<li style="margin:6px 0;"><a href="${escapeHtml(u)}">View photo</a></li>`
          )
          .join('')}</ul>`
      : '<p><em>No photos</em></p>'

  return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;">
  <p><strong>${escapeHtml(input.authorLine)}</strong> shared a trip memory with you.</p>
  <p><strong>Trip:</strong> ${escapeHtml(input.tripLabel)}</p>
  <p><a href="${escapeHtml(input.tripUrl)}">Open trip in TripWell</a></p>
  <hr style="border:none;border-top:1px solid #ddd;" />
  <p style="white-space:pre-wrap;">${escapeHtml(input.bodyExcerpt)}</p>
  <p><strong>Photos</strong></p>
  ${photos}
</body>
</html>
`.trim()
}

export async function sendTripMemoryShareEmail(input: {
  to: string
  subject: string
  html: string
}): Promise<{ providerMessageId: string | null; error?: string }> {
  const from = getMemoryShareFromAddress()
  if (!from) {
    return { providerMessageId: null, error: 'TRIPWELL_EMAIL_FROM is not configured' }
  }
  const resend = getResend()
  if (!resend) {
    return { providerMessageId: null, error: 'RESEND_API_KEY is not configured' }
  }

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  })

  if (error) {
    return { providerMessageId: null, error: error.message }
  }

  return { providerMessageId: data?.id ?? null }
}
