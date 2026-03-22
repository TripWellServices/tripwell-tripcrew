'use client'

import { Suspense } from 'react'
import ExperiencePlannerAll from '@/app/tripcrews/[id]/experiences/build/ExperiencePlannerAll'

export default function TravelerExperiencesBuildPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-6 py-8 text-gray-500">Loading…</div>}>
      <ExperiencePlannerAll tripCrewId={null} />
    </Suspense>
  )
}
