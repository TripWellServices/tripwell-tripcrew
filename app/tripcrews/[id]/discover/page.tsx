'use client'

import { useParams } from 'next/navigation'
import ExperiencesPageClient from './ExperiencesPageClient'

export default function CrewExperiencesPage() {
  const params = useParams()
  const tripCrewId = params.id as string

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Experiences</h1>
      <ExperiencesPageClient tripCrewId={tripCrewId} />
    </div>
  )
}
