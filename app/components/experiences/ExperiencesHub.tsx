'use client'

import Link from 'next/link'
import { experiencePaths } from '@/lib/experience-routes'

export default function ExperiencesHub() {
  const paths = experiencePaths()

  const cards = [
    {
      title: 'Build from saved',
      desc: 'Pick something you already saved and plan a trip around it.',
      href: paths.build,
      cta: 'Open saved list',
    },
    {
      title: 'Find experiences',
      desc: 'Browse by city — concerts, hikes, dining, and attractions.',
      href: paths.find,
      cta: 'Find',
    },
    {
      title: 'Enter an experience',
      desc: 'Add a hike (discover or paste) or jump to the catalogue.',
      href: paths.enter,
      cta: 'Enter',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Experiences</h1>
      <p className="text-gray-600 mb-8">
        Save, find, or add experiences. For city guides and trip building, use{' '}
        <Link href={paths.destinations} className="text-sky-600 font-medium hover:underline">
          Destinations
        </Link>{' '}
        or the{' '}
        <Link href={paths.planFork} className="text-sky-600 font-medium hover:underline">
          Planner
        </Link>
        .
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
