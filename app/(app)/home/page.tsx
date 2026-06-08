'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">TripWell</h1>
      <p className="text-gray-600 text-sm mb-8">
        Plan around a concert, save your trip, then push it to TripCrew when you&apos;re ready to share.
      </p>

      <ul className="grid gap-4 sm:grid-cols-2">
        <li>
          <Link
            href="/plan"
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-sky-300 hover:shadow-sm transition"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Concert Planner</h2>
            <p className="text-sm text-gray-600">
              Start with a show or festival — paste tickets or type the basics, then build your trip inline.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/my-trips"
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-emerald-300 hover:shadow-sm transition"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">My Trips</h2>
            <p className="text-sm text-gray-600">
              Your saved concert trips. Open one to keep building or push to TripCrew.
            </p>
          </Link>
        </li>
      </ul>
    </div>
  )
}
