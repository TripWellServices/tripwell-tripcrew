'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function ExperiencesHubPage() {
  const params = useParams()
  const tripCrewId = params.id as string
  const base = `/tripcrews/${tripCrewId}/experiences`

  const cards = [
    {
      title: 'Build from saved',
      desc: 'Pick something you already saved and plan a trip around it.',
      href: `${base}/build`,
      cta: 'Open saved list',
    },
    {
      title: 'Destinations',
      desc: 'City guides — what to do, best time to visit, and ideas you can save as attractions.',
      href: `/tripcrews/${tripCrewId}/destinations`,
      cta: 'Browse',
    },
    {
      title: 'Find experiences',
      desc: 'Browse by city — concerts, hikes, dining, and attractions.',
      href: `${base}/find`,
      cta: 'Find',
    },
    {
      title: 'Enter an experience',
      desc: 'Add a hike (discover or paste) or jump to the catalogue.',
      href: `${base}/enter`,
      cta: 'Enter',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Experiences</h1>
      <p className="text-gray-600 mb-8">
        Start from something you saved, a destination guide, or discover new ideas. Use{' '}
        <strong className="font-medium text-gray-800">Planner</strong> in the sidebar for trip vs
        season flows.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <li
            key={c.title}
            className="flex flex-col p-5 border border-gray-200 rounded-xl bg-white shadow-sm hover:border-sky-300 transition"
          >
            <h2 className="font-semibold text-gray-900 mb-1">{c.title}</h2>
            <p className="text-sm text-gray-600 flex-1 mb-4">{c.desc}</p>
            <Link
              href={c.href}
              className="inline-flex justify-center px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
            >
              {c.cta}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
