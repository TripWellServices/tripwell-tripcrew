/**
 * TripCrew Admin/Overview Page
 * 
 * Shows TripCrew details, members, trips, and admin actions
 * Server component with Prisma hydration (matching GoFast RunCrew admin)
 */

import { notFound, redirect } from 'next/navigation'
import { getTripCrew } from '@/lib/actions/tripcrew'
import Link from 'next/link'
import { format } from 'date-fns'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: {
    id: string
  }
}

export default async function TripCrewAdminPage({ params }: PageProps) {
  // TODO: Get travelerId from authenticated session (Firebase token)
  // For now, this will need client-side hydration
  // This is a placeholder - in production, use middleware to get travelerId
  
  // For MVP, we'll make this a client component that fetches
  // In production, use server component with auth middleware
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-600">
          TripCrew admin page - will be implemented with server component + auth middleware
        </p>
        <Link href="/tripcrews" className="text-sky-600 hover:underline">
          Back to TripCrews
        </Link>
      </div>
    </div>
  )
}

