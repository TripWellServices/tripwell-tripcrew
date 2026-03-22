import { Suspense } from 'react'
import HikePasteClient from '@/app/hikes/new/HikePasteClient'

export default function CrewNewHikePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-6 py-10 text-gray-500 text-sm">
          Loading…
        </div>
      }
    >
      <HikePasteClient />
    </Suspense>
  )
}
