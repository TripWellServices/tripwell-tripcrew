'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { getHydrateTraveler } from '@/lib/hydrateTravelerClient'
import { onAuthStateChanged } from 'firebase/auth'
import { LocalStorageAPI } from '@/lib/localStorage'
import { experiencePaths } from '@/lib/experience-routes'

type GuideRow = {
  id: string
  citySlug: string
  tagline: string | null
  city: { name: string; state: string | null; country: string | null }
}

export default function DestinationsListClient() {
  const router = useRouter()
  const paths = experiencePaths()

  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [guides, setGuides] = useState<GuideRow[]>([])
  const [loading, setLoading] = useState(true)
  const [cityName, setCityName] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        const res = await getHydrateTraveler(user)
        const data = await res.json()
        const tid = data.traveler?.id ?? null
        setTravelerId(tid)
        if (tid && data.traveler) LocalStorageAPI.setFullHydrationModel(data.traveler)
      } catch {
        setTravelerId(null)
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch('/api/city-guides')
      .then((r) => r.json())
      .then((data) => setGuides(data.guides || []))
      .catch(() => setGuides([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleGenerate(persist: boolean) {
    setError(null)
    if (!cityName.trim()) {
      setError('Enter a city name.')
      return
    }
    if (persist && !travelerId) {
      setError('Sign in to save a destination guide.')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/city-guides/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityName: cityName.trim(),
          state: state.trim() || undefined,
          ...(country.trim() ? { country: country.trim() } : {}),
          travelerId: persist ? travelerId : undefined,
          persist,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && data.guide?.citySlug) {
        router.push(`${paths.destinations}/${data.guide.citySlug}`)
        return
      }
      if (!res.ok) {
        throw new Error(data.error || 'Generate failed')
      }
      if (persist && data.guide?.citySlug) {
        router.push(`${paths.destinations}/${data.guide.citySlug}`)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Destinations</h1>
          <p className="text-gray-600 text-sm">
            City-first guides — what to do, best time to visit, and ideas you can turn into catalogue items.
          </p>
        </div>
        <Link
          href={paths.planFork}
          className="shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
        >
          Open planner
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Add destination (AI)</h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-3 flex-wrap">
          <input
            type="text"
            placeholder="City"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            className="flex-1 min-w-[8rem] border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="State / region (optional)"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full sm:w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Country (optional — AI infers if blank)"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full sm:w-52 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Tip: For cities like Naples, add <span className="font-medium">Italy</span> or leave country blank and
          we&apos;ll infer the right place.
        </p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerate(true)}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
          >
            {generating ? 'Working…' : 'Generate & save guide'}
          </button>
        </div>
        {!travelerId && (
          <p className="text-xs text-amber-800 mt-3">Sign in to save guides to the catalogue.</p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading destinations…</p>
      ) : guides.length === 0 ? (
        <p className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl p-8 text-center">
          No guides yet. Generate one above.
        </p>
      ) : (
        <ul className="space-y-3">
          {guides.map((g) => (
            <li key={g.id}>
              <Link
                href={`${paths.destinations}/${g.citySlug}`}
                className="block p-4 border border-gray-200 rounded-xl bg-white hover:border-sky-300 hover:shadow-sm transition"
              >
                <p className="font-semibold text-gray-900">
                  {g.city.name}
                  {g.city.state ? `, ${g.city.state}` : ''}
                </p>
                {g.tagline ? <p className="text-sm text-gray-600 mt-1 line-clamp-2">{g.tagline}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
