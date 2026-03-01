/**
 * Invite by slug URL (GoFast-style: handle or code in path)
 * /join/boston-crew or /join/ABC123 → redirect to /join?code=... so state lives in URL
 */

import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ code: string }>
}

export const dynamic = 'force-dynamic'

export default async function JoinBySlugPage({ params }: PageProps) {
  const { code } = await params
  const slug = code?.trim()
  if (!slug) redirect('/join')
  redirect(`/join?code=${encodeURIComponent(slug)}`)
}
