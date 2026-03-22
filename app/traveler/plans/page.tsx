'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

interface PlanSummary {
  id: string
  name: string
  season?: string | null
  type?: 'TRIP' | 'SEASON'
  tripCrew?: { id: string; name: string | null } | null
  _count: { trips: number; savedExperiences: number }
}

export default function TravelerPlansPage() {
  const router = useRouter()
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/')
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
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (!travelerId) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/plan?travelerId=${travelerId}`)
      .then((r) => r.json())
      .then((data) => setPlans(data.plans ?? []))
      .finally(() => setLoading(false))
  }, [travelerId])

  if (loading && !travelerId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/home" className="text-sm text-sky-600 hover:underline font-medium mb-6 inline-block">
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Plans</h1>
        <p className="text-gray-500 text-sm mb-2">
          Plans group your trips and saved experiences. Add experiences first, then start a trip from your list — or create a plan to organize ideas.
        </p>
        <p className="text-sm text-gray-600 mb-8">
          Start trips, seasons, or scratch details from the{' '}
          <Link href="/traveler/plan" className="text-sky-600 font-medium hover:underline">
            Planner
          </Link>
          . Browse{' '}
          <Link href="/traveler/destinations" className="text-sky-600 font-medium hover:underline">
            Destinations
          </Link>{' '}
          or{' '}
          <Link href="/traveler/experiences" className="text-sky-600 font-medium hover:underline">
            Experiences
          </Link>{' '}
          for ideas. Open a crew when you want shared planning.
        </p>

        <div className="space-y-4">
          <Link
            href="/traveler/plan"
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-sky-400 hover:text-sky-600 text-sm font-medium"
          >
            + Start from Planner
          </Link>

          {plans.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              No saved plans yet. Use the Planner to create a trip or season bucket.
            </p>
          )}

          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800">{plan.name}</h3>
                  {plan.type === 'SEASON' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      Season
                    </span>
                  )}
                </div>
                {plan.season && <p className="text-xs text-gray-500 mt-0.5">{plan.season}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {plan._count.trips} trip{plan._count.trips !== 1 ? 's' : ''} ·{' '}
                  {plan._count.savedExperiences} saved
                </p>
                {plan.tripCrew?.name && (
                  <p className="text-xs text-sky-600 mt-0.5">Shared with {plan.tripCrew.name}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/traveler/plans/${plan.id}`}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
