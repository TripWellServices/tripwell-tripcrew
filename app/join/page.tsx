/**
 * Join TripCrew Page
 * 
 * Direct link to join a TripCrew via invite code
 * Server component that handles join and redirects
 * 
 * URL: /join?code=ABC123
 */

export const dynamic = 'force-dynamic'

import { lookupTripCrewByCode, joinTripCrew } from '@/lib/actions/tripcrew'
import { redirect } from 'next/navigation'
import JoinPageClient from './JoinPageClient'

interface PageProps {
  searchParams: { code?: string }
}

export default async function JoinPage({ searchParams }: PageProps) {
  const code = searchParams.code

  if (!code) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">No Invite Code</h1>
          <p className="text-gray-600 mb-6">Please provide an invite code to join a TripCrew.</p>
        </div>
      </div>
    )
  }

  // Lookup the TripCrew to show preview
  const lookupResult = await lookupTripCrewByCode(code)

  if (!lookupResult.success || !lookupResult.tripCrew) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Invite Code</h1>
          <p className="text-gray-600 mb-6">{lookupResult.error || 'This invite code is invalid or expired.'}</p>
        </div>
      </div>
    )
  }

  // Show preview page (client component for auth handling)
  // If user is authenticated, they can join directly
  // If not authenticated, show sign up/sign in options
  return <JoinPageClient code={code} tripCrew={lookupResult.tripCrew} />
}
