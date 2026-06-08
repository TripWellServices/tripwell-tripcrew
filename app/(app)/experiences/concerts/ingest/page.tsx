'use client'

import { Suspense } from 'react'
import ConcertTripWizard from '@/app/components/planner/ConcertTripWizard'

export default function ConcertsIngestPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-10">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <ConcertTripWizard />
    </Suspense>
  )
}
