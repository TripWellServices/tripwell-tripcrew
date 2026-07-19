import { Suspense } from 'react'
import ConcertIngest from '@/app/components/planner/ConcertIngest'
import { resolveGooglePlacesApiKey } from '@/lib/google-places-config'

export default function ConcertsIngestPage() {
  const googleApiKey = resolveGooglePlacesApiKey() || ''

  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-10">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <ConcertIngest googleApiKey={googleApiKey} />
    </Suspense>
  )
}
