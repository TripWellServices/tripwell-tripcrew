'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function PlanDetailPage() {
  const params = useParams()
  const planId = params.planId as string
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!planId) return
    fetch(`/api/plan/${planId}`)
      .then((r) => r.json())
      .then((data) => setPlan(data.plan))
      .finally(() => setLoading(false))
  }, [planId])

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading…</p></div>
  if (!plan) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-red-500">Plan not found.</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/traveler/plans" className="text-sm text-sky-600 hover:underline font-medium mb-6 inline-block">
          &larr; Back to My Plans
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
          {plan.type === 'SEASON' && (
            <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-100 text-amber-900">
              Season plan
            </span>
          )}
        </div>
        {plan.season && <p className="text-gray-500 text-sm mt-1">{plan.season}</p>}
        {plan.tripCrew?.name && <p className="text-sky-600 text-sm mt-0.5">Shared with {plan.tripCrew.name}</p>}

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Trips</h2>
          {plan.trips?.length ? (
            <ul className="space-y-2">
              {plan.trips.map((t: any) => (
                <li key={t.id}>
                  <Link href={`/trip/${t.id}/admin`} className="block p-3 bg-white border border-gray-200 rounded-lg hover:border-sky-300 hover:shadow-sm">
                    {t.tripName} {t.dateRange && <span className="text-gray-500 text-sm">· {t.dateRange}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No trips in this plan yet. Use Discover and &ldquo;Build a trip&rdquo; to add one.</p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Saved experiences</h2>
          {plan.savedExperiences?.length ? (
            <ul className="space-y-2">
              {plan.savedExperiences.map((w: any) => (
                <li key={w.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                  {w.title}
                  {(w.concert || w.hike || w.dining || w.attraction) && (
                    <span className="text-gray-500 text-sm ml-2">
                      ({w.concert?.name || w.hike?.name || w.dining?.title || w.attraction?.title})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No saved experiences in this plan yet.</p>
          )}
        </section>
      </div>
    </div>
  )
}
