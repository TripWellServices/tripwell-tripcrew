/**
 * Plan a trip — Landing page with card-based options
 */

export const dynamic = 'force-dynamic'

import PlanLandingClient from './PlanLandingClient'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tripId?: string }>
}

export default async function PlanPage({ params }: PageProps) {
  return <PlanLandingClient />
}
