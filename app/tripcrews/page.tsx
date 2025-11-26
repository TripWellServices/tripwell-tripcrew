/**
 * TripCrews List Page
 * 
 * Lists all TripCrews the authenticated traveler belongs to
 * Server component with Prisma hydration
 */

import { redirect } from 'next/navigation'
import { getTravelerTripCrews } from '@/lib/actions/tripcrew'
import Link from 'next/link'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

// Get traveler ID from localStorage (client-side) - for now we'll use a server action
// TODO: Add proper auth middleware
async function getTravelerIdFromRequest(): Promise<string | null> {
  // This is a placeholder - in production, get from Firebase token
  // For now, we'll need to pass it from client
  return null
}

export default async function TripCrewsPage() {
  // TODO: Get travelerId from authenticated session
  // For now, this page will need to be client-side to get travelerId from localStorage
  // Or we can create an API route that uses Firebase token
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">My TripCrews</h1>
            <Link
              href="/tripcrews/new"
              className="px-6 py-3 bg-white text-sky-600 font-semibold rounded-lg hover:bg-sky-50 transition shadow-lg"
            >
              + Create TripCrew
            </Link>
          </div>

          <p className="text-white/80 mb-8">
            This page will show all your TripCrews. For now, use the button above to create one.
          </p>
        </div>
      </div>
    </div>
  )
}

