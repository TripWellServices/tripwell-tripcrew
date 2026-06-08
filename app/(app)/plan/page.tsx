'use client'

import { Suspense } from 'react'
import ConcertPlanner from '@/app/components/planner/ConcertPlanner'

export default function ConcertPlannerPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <ConcertPlanner />
    </Suspense>
  )
}
