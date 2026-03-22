'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Planner, { type PlannerPlanScope } from '@/app/components/planner/Planner'

function TravelerPlanDestinationInner() {
  const searchParams = useSearchParams()
  const modeRaw = searchParams.get('mode')
  const planScope: PlannerPlanScope = modeRaw === 'season' ? 'season' : 'trip'
  const citySlug = searchParams.get('citySlug') ?? searchParams.get('slug')

  return (
    <Planner planScope={planScope} citySlug={citySlug} backHref="/plan" />
  )
}

export default function TravelerPlanDestinationPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-10">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <TravelerPlanDestinationInner />
    </Suspense>
  )
}
