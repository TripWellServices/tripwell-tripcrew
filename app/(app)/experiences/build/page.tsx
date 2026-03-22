'use client'

import { Suspense } from 'react'
import ExperiencePlannerAll from '@/app/components/experiences/ExperiencePlannerAll'

export default function ExperiencesBuildPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-6 py-8 text-gray-500">Loading…</div>}>
      <ExperiencePlannerAll />
    </Suspense>
  )
}
