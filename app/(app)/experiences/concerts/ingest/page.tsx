'use client'

import { Suspense } from 'react'
import ConcertIngest from '@/app/components/planner/ConcertIngest'

export default function ConcertsIngestPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-10">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <ConcertIngest />
    </Suspense>
  )
}
