'use client'

import Link from 'next/link'

/**
 * Planner entry — four paths: direct trip form, Discover (AI), Destinations, Experience build.
 */
export default function PlanForkPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/home" className="text-sm text-sky-600 hover:underline font-medium mb-6 inline-block">
        ← Home
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Planner</h1>
      <p className="text-gray-600 mb-8">
        Choose how you want to start. Create trips on your account first — send them to a TripCrew from
        trip admin when you want to collaborate.
      </p>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Start a trip</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        <li>
          <Link
            href="/plan/got-plan"
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-sky-300 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Got my plan</h3>
            <p className="text-sm text-gray-600">
              Already have dates or confirmations? Enter details or paste an itinerary to extract flights
              and hotels.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/plan/destination?mode=trip"
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-violet-300 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Discover</h3>
            <p className="text-sm text-gray-600">
              Explore where to go — describe what you&apos;re thinking; AI suggests cities, then you pick
              one and add it to a trip.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/destinations"
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-emerald-300 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Destination</h3>
            <p className="text-sm text-gray-600">
              Open city guides, pick a place, then plan from that guide.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/experiences/build"
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-amber-300 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Experience</h3>
            <p className="text-sm text-gray-600">
              Pick something you saved and build dates and a trip around it.
            </p>
          </Link>
        </li>
      </ul>

      <p className="text-sm text-gray-500 mt-10">
        Browse <Link href="/destinations" className="text-sky-600 font-medium hover:underline">destinations</Link>
        {' '}or{' '}
        <Link href="/experiences" className="text-sky-600 font-medium hover:underline">experiences</Link>.
        Trips with dates appear on your <Link href="/calendar" className="text-sky-600 font-medium hover:underline">calendar</Link>.
      </p>
    </div>
  )
}
