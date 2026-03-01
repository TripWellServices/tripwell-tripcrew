/**
 * Plan a trip — Where would you like to go?
 * Steps: Where + AI → Choose region / something / who / vibes → AI recommendation → Save city + Add to trip as destination
 */

export const dynamic = 'force-dynamic'

import PlanWizardClient from './PlanWizardClient'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tripId?: string }>
}

export default async function PlanPage({ params, searchParams }: PageProps) {
  const { id: tripCrewId } = await params
  const { tripId } = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <PlanWizardClient tripCrewId={tripCrewId} initialTripId={tripId || null} />
    </div>
  )
}
