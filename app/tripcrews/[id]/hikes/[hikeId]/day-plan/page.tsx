import { Suspense } from 'react'
import HikeDayPlanClient from '@/app/hikes/[id]/day-plan/HikeDayPlanClient'

export default function CrewHikeDayPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-6 py-10 text-gray-500 text-sm">
          Loading…
        </div>
      }
    >
      <HikeDayPlanClient />
    </Suspense>
  )
}
