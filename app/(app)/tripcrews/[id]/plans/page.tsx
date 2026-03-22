'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
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

export default function CrewPlansPage() {
  const params = useParams()
  const tripCrewId = params.id as string
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanSeason, setNewPlanSeason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const res = await fetch(`/api/auth/hydrate?firebaseId=${user.uid}`)
          const data = await res.json()
          setTravelerId(data.traveler?.id ?? null)
        } catch {
          setTravelerId(null)
        }
      } else {
        setTravelerId(null)
      }
    })
    return () => unsubscribe()
  }, [])

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

  async function createPlan() {
    if (!travelerId || !newPlanName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelerId,
          name: newPlanName.trim(),
          season: newPlanSeason.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlans((prev) => [data.plan, ...prev])
      setShowNewPlan(false)
      setNewPlanName('')
      setNewPlanSeason('')
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !travelerId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">My Plans</h1>
      <p className="text-gray-500 text-sm mb-4">
        Plans group your trips and saved experiences. Add experiences first, then start a trip from your list — or create a plan to organize ideas.
      </p>
      <p className="text-sm text-gray-600 mb-8">
        <Link href="/experiences" className="text-sky-600 hover:underline">
          Experiences
        </Link>
        {' · '}
        <Link href="/experiences/find" className="text-sky-600 hover:underline">
          Find experiences
        </Link>
      </p>

      <div className="space-y-4">
        {showNewPlan ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">New plan</h2>
            <input
              type="text"
              placeholder="Plan name"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <input
              type="text"
              placeholder="Season (optional)"
              value={newPlanSeason}
              onChange={(e) => setNewPlanSeason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowNewPlan(false); setNewPlanName(''); setNewPlanSeason('') }}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createPlan}
                disabled={submitting || !newPlanName.trim()}
                className="px-3 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewPlan(true)}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-sky-400 hover:text-sky-600 text-sm font-medium"
          >
            + New plan
          </button>
        )}

        {plans.length === 0 && !showNewPlan && (
          <p className="text-sm text-gray-500 text-center py-8">No plans yet. Create one to get started.</p>
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
                href={`/calendar/${plan.id}`}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
