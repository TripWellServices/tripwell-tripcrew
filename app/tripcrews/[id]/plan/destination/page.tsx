'use client'

import { useParams, useSearchParams } from 'next/navigation'
import Planner, { type PlannerPlanScope } from '@/app/components/planner/Planner'

export default function PlanDestinationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const tripCrewId = params.id as string

  const modeRaw = searchParams.get('mode')
  const planScope: PlannerPlanScope = modeRaw === 'season' ? 'season' : 'trip'
  const citySlug = searchParams.get('citySlug') ?? searchParams.get('slug')

  return (
    <Planner
      tripCrewId={tripCrewId}
      planScope={planScope}
      citySlug={citySlug}
      backHref={`/tripcrews/${tripCrewId}/plan`}
    />
  )
}
