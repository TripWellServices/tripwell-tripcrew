'use client'

import Link from 'next/link'

/**
 * Planner entry — four paths: confirmed ingest, event planning, destination pick, experience browse.
 */
export default function PlanForkPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/home" className="text-sm text-sky-600 hover:underline font-medium mb-6 inline-block">
        ← Home
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Planner</h1>
      <p className="text-gray-600 mb-8">
        Start with what you know. Trips are created on your account first — invite people through TripCrew
        after your plan is in.
      </p>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Start a trip</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        <li>
          <Link
            href="/plan/got-plan"
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-sky-300 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Already booked</h3>
            <p className="text-sm text-gray-600">
              Tickets, hotel, or confirmations in hand? Paste them — we&apos;ll build your trip from what
              you have.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/plan/got-plan?intent=event"
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-purple-300 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Plan around an event</h3>
            <p className="text-sm text-gray-600">
              Concert or festival in mind? Tell us what and where — Osheaga, a show, a game — then add
              logistics.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/plan/destination?mode=trip"
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-violet-300 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pick a destination</h3>
            <p className="text-sm text-gray-600">
              Not sure where yet? Describe what you&apos;re thinking; AI suggests cities, then you pick one.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/experiences/find"
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-amber-300 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Explore experiences</h3>
            <p className="text-sm text-gray-600">
              Browse concerts, dining, hikes, and attractions in a city — save picks or build a trip
              around one.
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
