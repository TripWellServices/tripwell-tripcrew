import { Suspense } from 'react'
import DestinationGuideClient from '@/app/components/destinations/DestinationGuideClient'

export default async function TravelerDestinationGuidePage({
  params,
}: {
  params: Promise<{ citySlug: string }>
}) {
  const { citySlug } = await params
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-6 py-10">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <DestinationGuideClient tripCrewId={null} citySlug={citySlug} />
    </Suspense>
  )
}
