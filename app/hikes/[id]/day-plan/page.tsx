import { Suspense } from 'react'
import HikeDayPlanClient from './HikeDayPlanClient'

export default function HikeDayPlanPage() {
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
