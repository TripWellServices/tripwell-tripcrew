/**
 * Slim crew context bar (no second sidebar). Used inside AppShell main for /tripcrews/[id]/*.
 */

'use client'

import Link from 'next/link'

interface TripCrewChromeProps {
  tripCrewId: string
  tripCrew: {
    id: string
    name: string | null
    memberships?: Array<{ id: string }>
    trips?: Array<unknown>
    roles?: Array<{ travelerId: string; role: string }>
  }
  travelerId: string | null
  inviteUrl?: string
  inviteCopied?: boolean
  onCopyInvite?: () => void
  children: React.ReactNode
}

export default function TripCrewChrome({
  tripCrewId,
  tripCrew,
  travelerId,
  inviteUrl,
  inviteCopied,
  onCopyInvite,
  children,
}: TripCrewChromeProps) {
  const isAdmin = tripCrew.roles?.some((r) => r.travelerId === travelerId && r.role === 'admin')

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link href="/tripcrews" className="text-sky-600 hover:underline font-medium">
            ← TripCrews
          </Link>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-900 truncate max-w-[200px]" title={tripCrew.name || ''}>
            {tripCrew.name || 'Crew'}
          </span>
          <span className="text-gray-500 text-xs">
            {tripCrew.memberships?.length ?? 0} members · {tripCrew.trips?.length ?? 0} trips
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <Link
            href={`/tripcrews/${tripCrewId}/wishlist`}
            className="text-sky-700 font-medium hover:underline"
          >
            Wishlist
          </Link>
          <Link
            href={`/tripcrews/${tripCrewId}/plans`}
            className="text-gray-700 font-medium hover:underline"
          >
            Saved lists
          </Link>
        </div>
        {isAdmin && onCopyInvite && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Invite</span>
            {inviteUrl ? (
              <>
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 min-w-[12rem] max-w-xl px-2 py-1 text-xs border border-gray-300 rounded bg-gray-50"
                />
                <button
                  type="button"
                  onClick={onCopyInvite}
                  className={`shrink-0 px-2 py-1 text-xs rounded font-medium transition ${
                    inviteCopied ? 'bg-green-600 text-white' : 'bg-sky-600 text-white hover:bg-sky-700'
                  }`}
                >
                  {inviteCopied ? 'Copied' : 'Copy'}
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-500">Loading link…</span>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </div>
  )
}
