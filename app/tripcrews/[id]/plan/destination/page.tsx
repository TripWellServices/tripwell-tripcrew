'use client'

import { useParams } from 'next/navigation'
import ExperienceTripCreator from '../../experiences/build/ExperienceTripCreator'

export default function PlanDestinationPage() {
  const params = useParams()
  const tripCrewId = params.id as string

  return (
    <ExperienceTripCreator
      tripCrewId={tripCrewId}
      initialTripId={null}
      forceCityFlow
      backHref={`/tripcrews/${tripCrewId}`}
    />
  )
}
