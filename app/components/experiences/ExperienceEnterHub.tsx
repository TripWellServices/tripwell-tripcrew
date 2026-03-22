'use client'

import Link from 'next/link'
import { experiencePaths } from '@/lib/experience-routes'

export default function ExperienceEnterHub({ tripCrewId }: { tripCrewId: string | null }) {
  const paths = experiencePaths(tripCrewId)
  const returnTo = paths.hub
  const hikesHref =
    tripCrewId != null
      ? `/tripcrews/${tripCrewId}/hikes/new?return=${encodeURIComponent(returnTo)}`
      : `/hikes/new?return=${encodeURIComponent(returnTo)}`

  const cards = [
    {
      title: 'Hike — discover or paste',
      desc: 'AI recommendations from a short form, or paste an AllTrails-style blurb.',
      href: hikesHref,
      cta: 'Add a hike',
    },
    {
      title: 'Browse catalogue',
      desc: 'Find concerts, dining, hikes, and attractions by city.',
      href: paths.find,
      cta: 'Open find',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link
        href={paths.hub}
        className="text-sm text-sky-600 hover:text-sky-800 font-medium mb-6 inline-block"
      >
        ← Back to Experiences
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter an experience</h1>
      <p className="text-gray-600 mb-8">
        Choose how you want to add something — by type or by browsing the catalogue.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
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
