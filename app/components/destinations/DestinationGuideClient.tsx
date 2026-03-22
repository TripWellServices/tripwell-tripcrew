'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { LocalStorageAPI } from '@/lib/localStorage'
import { experiencePaths, withPromoteToCrew } from '@/lib/experience-routes'

type GuideDetail = {
  id: string
  citySlug: string
  tagline: string | null
  description: string | null
  bestTimeToVisit: string | null
  attractionNames: string[]
  city: { id: string; name: string; state: string | null; country: string | null }
}

export default function DestinationGuideClient({
  tripCrewId,
  citySlug,
}: {
  tripCrewId: string | null
  citySlug: string
}) {
  const paths = experiencePaths(tripCrewId)
  const promote = useSearchParams().get('promoteToCrewId')

  const [guide, setGuide] = useState<GuideDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [savingTitle, setSavingTitle] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setTravelerId(null)
        return
      }
      const stored = LocalStorageAPI.getTravelerId()
      if (stored) {
        setTravelerId(stored)
        return
      }
      try {
        const res = await fetch(`/api/auth/hydrate?firebaseId=${user.uid}`)
        const data = await res.json()
        setTravelerId(data.traveler?.id ?? null)
      } catch {
        setTravelerId(null)
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!citySlug) return
    setLoading(true)
    fetch(`/api/city-guides?citySlug=${encodeURIComponent(citySlug)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Not found')
        return data.guide as GuideDetail
      })
      .then(setGuide)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [citySlug])

  async function saveAttractionAsCatalogue(title: string) {
    if (!guide?.city?.id) return
    setSavingTitle(title)
    setError(null)
    try {
      const res = await fetch('/api/attractions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          cityId: guide.city.id,
          category: 'From destination guide',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingTitle(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  if (error || !guide) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-3">
        <p className="text-sm text-red-700">{error || 'Not found'}</p>
        <Link
          href={withPromoteToCrew(paths.destinations, promote)}
          className="text-sky-600 text-sm hover:underline"
        >
          ← All destinations
        </Link>
      </div>
    )
  }

  const cityLabel = `${guide.city.name}${guide.city.state ? `, ${guide.city.state}` : ''}`

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <Link
        href={withPromoteToCrew(paths.destinations, promote)}
        className="text-sm text-sky-600 hover:underline font-medium mb-6 inline-block"
      >
        ← Destinations
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">{cityLabel}</h1>
      {guide.tagline ? <p className="text-lg text-sky-900 font-medium mb-4">{guide.tagline}</p> : null}

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={withPromoteToCrew(paths.planDestination('trip', guide.citySlug), promote)}
          className="inline-flex px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
        >
          Plan a trip
        </Link>
        <Link
          href={withPromoteToCrew(paths.planDestination('season', guide.citySlug), promote)}
          className="inline-flex px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700"
        >
          Plan a season
        </Link>
      </div>

      {guide.bestTimeToVisit ? (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
            Best time to visit
          </h2>
          <p className="text-gray-800">{guide.bestTimeToVisit}</p>
        </section>
      ) : null}

      {guide.description ? (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            What to do
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap">{guide.description}</p>
        </section>
      ) : null}

      {guide.attractionNames.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Ideas → catalogue
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Save a string as a first-class attraction in this city (discover / itinerary can use it later).
          </p>
          <ul className="space-y-2">
            {guide.attractionNames.map((name) => (
              <li
                key={name}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border border-gray-200 rounded-lg bg-white"
              >
                <span className="text-sm text-gray-900">{name}</span>
                <button
                  type="button"
                  disabled={!travelerId || savingTitle === name}
                  onClick={() => saveAttractionAsCatalogue(name)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-sky-300 text-sky-800 hover:bg-sky-50 disabled:opacity-50"
                >
                  {savingTitle === name ? 'Saving…' : 'Save to catalogue'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
