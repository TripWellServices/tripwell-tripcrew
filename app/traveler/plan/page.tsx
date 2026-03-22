'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { experiencePaths, withPromoteToCrew } from '@/lib/experience-routes'

function TravelerPlanForkInner() {
  const paths = experiencePaths(null)
  const promote = useSearchParams().get('promoteToCrewId')

  const tripAi = withPromoteToCrew(paths.planDestination('trip'), promote)
  const seasonAi = withPromoteToCrew(paths.planDestination('season'), promote)
  const scratch = withPromoteToCrew(paths.planScratch, promote)
  const dest = withPromoteToCrew(paths.destinations, promote)
  const build = withPromoteToCrew(paths.build, promote)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link
        href="/home"
        className="text-sm text-sky-600 hover:underline font-medium mb-6 inline-block"
      >
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Planner</h1>
      <p className="text-gray-600 mb-8">
        Choose how you want to start. Build on your account first — attach a crew from My Plans when you want
        to collaborate.
      </p>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Start a trip</h2>
      <ul className="grid gap-4 sm:grid-cols-2 mb-10">
        <li>
          <Link
            href={tripAi}
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-sky-300 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Build from scratch</h3>
            <p className="text-sm text-gray-600">
              Describe where you&apos;re thinking — AI suggests cities, then you pick one and add it to a trip.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={dest}
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-emerald-300 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">From a destination</h3>
            <p className="text-sm text-gray-600">
              Open city guides, pick a place, then plan a trip or season from that guide.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={build}
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-violet-300 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">From an experience</h3>
            <p className="text-sm text-gray-600">
              Choose something you already saved and build dates and a trip around it.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={scratch}
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-gray-400 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter trip details</h3>
            <p className="text-sm text-gray-600">
              Trip name, optional place, start and end dates — no AI, straight to your trip.
            </p>
          </Link>
        </li>
      </ul>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Season bucket</h2>
      <ul className="grid gap-4 sm:grid-cols-1 max-w-md">
        <li>
          <Link
            href={seasonAi}
            className="block h-full p-6 border border-amber-200 rounded-xl bg-amber-50/80 hover:border-amber-400 hover:shadow-sm transition"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Plan a season</h3>
            <p className="text-sm text-gray-600">
              Top-level season plan — a home for multiple trips and saved experiences over weeks or months.
            </p>
          </Link>
        </li>
      </ul>

      <p className="text-sm text-gray-500 mt-10">
        Browse{' '}
        <Link href={dest} className="text-sky-600 font-medium hover:underline">
          destinations
        </Link>{' '}
        or{' '}
        <Link href={withPromoteToCrew(paths.hub, promote)} className="text-sky-600 font-medium hover:underline">
          experiences
        </Link>
        .
      </p>
    </div>
  )
}

export default function TravelerPlanForkPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-6 py-10">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <TravelerPlanForkInner />
    </Suspense>
  )
}
