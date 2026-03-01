/**
 * Join TripCrew Page (GoFast-style: invite by handle/slug or legacy code)
 *
 * URL: /join?code=slug-or-ABC123
 */

export const dynamic = 'force-dynamic'

import { lookupTripCrewByInviteSlug } from '@/lib/actions/tripcrew'
import JoinPageClient from './JoinPageClient'

interface PageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function JoinPage({ searchParams }: PageProps) {
  const params = await searchParams
  const slug = params.code

  if (!slug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Open your invite link</h1>
          <p className="text-gray-600 mb-6">
            To join a TripCrew, open the invite link you received (in email or from your crew admin). That link will bring you here with everything set — you sign in if needed, then join.
          </p>
          <a
            href="/tripcrews"
            className="inline-block px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
          >
            Back to My TripCrews
          </a>
        </div>
      </div>
    )
  }

  const lookupResult = await lookupTripCrewByInviteSlug(slug)

  if (!lookupResult.success || !lookupResult.tripCrew) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid invite link</h1>
          <p className="text-gray-600 mb-6">{lookupResult.error || 'This invite link is invalid or expired.'}</p>
        </div>
      </div>
    )
  }

  return <JoinPageClient slug={slug} tripCrew={lookupResult.tripCrew} />
}
