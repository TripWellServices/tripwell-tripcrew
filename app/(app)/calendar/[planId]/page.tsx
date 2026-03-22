'use client'

import Link from 'next/link'

/**
 * Legacy URL: /calendar/[planId] referred to a Plan. Plans are removed; trips are the planning unit.
 */
export default function LegacyCalendarPlanPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900">This link is outdated</h1>
        <p className="text-gray-600 text-sm">
          TripWell no longer uses separate &ldquo;plans.&rdquo; Your trips live under{' '}
          <Link href="/plan/scratch" className="text-sky-600 hover:underline">
            create a trip
          </Link>{' '}
          or open a trip from your crew or home.
        </p>
        <Link
          href="/plan/scratch"
          className="inline-block px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
        >
          Start a trip
        </Link>
      </div>
    </div>
  )
}
