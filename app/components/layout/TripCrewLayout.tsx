/**
 * TripCrew Layout Component
 * 
 * Shared layout with persistent sidebar for all TripCrew pages
 */

'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface TripCrewLayoutProps {
  tripCrewId: string
  tripCrew: {
    id: string
    name: string | null
    memberships?: Array<{
      id: string
      traveler: {
        id: string
        firstName: string | null
        lastName: string | null
        photoURL: string | null
      }
    }>
    roles?: Array<{
      travelerId: string
      role: string
    }>
    trips?: Array<any>
  }
  travelerId: string | null
  inviteUrl?: string
  inviteCopied?: boolean
  onCopyInvite?: () => void
  navView?: 'trips' | 'past'
  onNavViewChange?: (view: 'trips' | 'past') => void
  categorizedTrips?: {
    upcoming: any[]
    past: any[]
  }
  children: React.ReactNode
}

export default function TripCrewLayout({
  tripCrewId,
  tripCrew,
  travelerId,
  inviteUrl,
  inviteCopied,
  onCopyInvite,
  navView = 'trips',
  onNavViewChange,
  categorizedTrips,
  children,
}: TripCrewLayoutProps) {
  const pathname = usePathname()
  const isAdmin = tripCrew.roles?.some((r) => r.travelerId === travelerId && r.role === 'admin')

  const isActive = (path: string) => {
    if (path === `/tripcrews/${tripCrewId}`) {
      return pathname === path || pathname === `/tripcrews/${tripCrewId}`
    }
    return pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left sidebar — persistent navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <Link href="/home" className="text-sm text-sky-600 hover:underline font-medium">
            ← Dashboard
          </Link>
          <Link href="/tripcrews" className="text-sm text-gray-500 hover:text-gray-700 ml-2">
            Crews
          </Link>
          <h1 className="text-lg font-bold text-gray-900 mt-2 truncate" title={tripCrew.name || ''}>
            {tripCrew.name}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {tripCrew.memberships?.length || 0} members · {tripCrew.trips?.length || 0} trips
          </p>
        </div>

        <nav className="p-2 space-y-1 border-b border-gray-200">
          <Link
            href={`/tripcrews/${tripCrewId}/experiences/build`}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              isActive(`/tripcrews/${tripCrewId}/experiences`)
                ? 'bg-sky-100 text-sky-800'
                : 'text-gray-700 hover:bg-sky-50 hover:text-sky-700'
            }`}
          >
            <span>Experiences</span>
          </Link>
          <Link
            href={`/tripcrews/${tripCrewId}/plans`}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              isActive(`/tripcrews/${tripCrewId}/plans`)
                ? 'bg-sky-100 text-sky-800'
                : 'text-gray-700 hover:bg-sky-50 hover:text-sky-700'
            }`}
          >
            <span>Saved Lists</span>
          </Link>
          {onNavViewChange ? (
            <>
              <button
                type="button"
                onClick={() => onNavViewChange('trips')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  navView === 'trips' && pathname === `/tripcrews/${tripCrewId}`
                    ? 'bg-sky-100 text-sky-800'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                My Trips
              </button>
              <button
                type="button"
                onClick={() => onNavViewChange('past')}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  navView === 'past' && pathname === `/tripcrews/${tripCrewId}`
                    ? 'bg-gray-100 text-gray-800'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span>Past trips</span>
                {categorizedTrips?.past.length ? (
                  <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                    {categorizedTrips.past.length}
                  </span>
                ) : null}
              </button>
            </>
          ) : (
            <Link
              href={`/tripcrews/${tripCrewId}`}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive(`/tripcrews/${tripCrewId}`)
                  ? 'bg-sky-100 text-sky-800'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              My Trips
            </Link>
          )}
        </nav>

        <div className="p-4 flex-1">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Members</h2>
          {tripCrew.memberships && tripCrew.memberships.length > 0 ? (
            <div className="space-y-2">
              {tripCrew.memberships.map((membership) => {
                const memberRole = tripCrew.roles?.find((r) => r.travelerId === membership.traveler.id)
                return (
                  <div key={membership.id} className="flex items-center gap-2">
                    {membership.traveler.photoURL ? (
                      <img
                        src={membership.traveler.photoURL}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                        {membership.traveler.firstName?.[0] || '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {membership.traveler.firstName} {membership.traveler.lastName}
                      </p>
                      {memberRole && (
                        <span className="text-xs text-sky-600">{memberRole.role}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No members yet.</p>
          )}

          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Invite</h3>
              {inviteUrl ? (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={inviteUrl}
                      readOnly
                      className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-300 rounded bg-gray-50"
                    />
                    <button
                      onClick={onCopyInvite}
                      className={`shrink-0 px-2 py-1.5 text-xs rounded font-medium transition ${
                        inviteCopied
                          ? 'bg-green-600 text-white'
                          : 'bg-sky-600 text-white hover:bg-sky-700'
                      }`}
                    >
                      {inviteCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Share link to invite</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Loading link…</p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
