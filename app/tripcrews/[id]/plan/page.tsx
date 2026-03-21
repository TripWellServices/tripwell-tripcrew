'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function PlanForkPage() {
  const params = useParams()
  const tripCrewId = params.id as string
  const base = `/tripcrews/${tripCrewId}/plan/destination`

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link
        href={`/tripcrews/${tripCrewId}`}
        className="text-sm text-sky-600 hover:underline font-medium mb-6 inline-block"
      >
        ← Back to crew
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Planner</h1>
      <p className="text-gray-600 mb-8">
        Start from a destination or a saved experience. Choose whether you&apos;re shaping one trip or a
        seasonal bucket for several trips and ideas.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        <li>
          <Link
            href={`${base}?mode=trip`}
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-sky-300 hover:shadow-sm transition"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Plan a trip</h2>
            <p className="text-sm text-gray-600">
              Pick a place (or start from a destination guide), get AI suggestions, and build a crew trip with
              dates and an itinerary anchor.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={`${base}?mode=season`}
            className="block h-full p-6 border border-gray-200 rounded-xl bg-white hover:border-amber-300 hover:shadow-sm transition"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Plan a season</h2>
            <p className="text-sm text-gray-600">
              Create a top-level season plan — a home for multiple trips and saved experiences over weeks or
              months.
            </p>
          </Link>
        </li>
      </ul>
      <p className="text-sm text-gray-500 mt-8">
        Browse saved{' '}
        <Link href={`/tripcrews/${tripCrewId}/destinations`} className="text-sky-600 font-medium hover:underline">
          destinations
        </Link>{' '}
        with AI-written guides, or use{' '}
        <Link href={`/tripcrews/${tripCrewId}/experiences`} className="text-sky-600 font-medium hover:underline">
          Experiences
        </Link>{' '}
        to plan around something specific.
      </p>
    </div>
  )
}
