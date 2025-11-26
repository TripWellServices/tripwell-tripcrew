/**
 * TripCrew Admin Page
 * 
 * Central container for TripCrew management (matching GoFast RunCrew Admin)
 * Shows crew details, members, trips, and admin actions
 */

import { redirect } from 'next/navigation'
import { getTripCrew } from '@/lib/actions/tripcrew'
import Link from 'next/link'
import { format } from 'date-fns'
import TripCrewAdminClient from './TripCrewAdminClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: {
    id: string
  }
}

export default async function TripCrewAdminPage({ params }: PageProps) {
  // Get travelerId from client-side (will be passed from client component)
  // For now, we'll make this a hybrid approach where the client component
  // fetches the data after getting travelerId from localStorage
  
  // This page will render a client component that handles auth and data fetching
  return <TripCrewAdminClient tripCrewId={params.id} />
}
