'use client'

import { Suspense } from 'react'
import GotPlanWizard from '@/app/components/planner/GotPlanWizard'

export default function TravelerPlanGotPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <GotPlanWizard />
    </Suspense>
  )
}
