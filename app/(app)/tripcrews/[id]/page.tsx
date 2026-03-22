/**
 * TripCrew Admin Page
 * 
 * Central container for TripCrew management (matching GoFast RunCrew Admin)
 * Shows crew details, members, trips, and admin actions
 */

import TripCrewAdminClient from './TripCrewAdminClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TripCrewAdminPage({ params }: PageProps) {
  const { id } = await params
  return <TripCrewAdminClient tripCrewId={id} />
}
