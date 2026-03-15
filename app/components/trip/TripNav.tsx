'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface TripNavProps {
  tripId: string
}

export default function TripNav({ tripId }: TripNavProps) {
  const pathname = usePathname()
  const base = `/trip/${tripId}`

  const isOverview = pathname === base || pathname === `${base}/admin`
  const isPlan = pathname === `${base}/plan`
  const isDiscover = pathname === `${base}/discover`

  return (
    <nav className="p-2 space-y-1 border-b border-gray-200">
      <Link
        href={`${base}/admin`}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
          isOverview ? 'bg-sky-100 text-sky-800' : 'text-gray-700 hover:bg-sky-50 hover:text-sky-700'
        }`}
      >
        <span>Overview</span>
      </Link>
      <Link
        href={`${base}/plan`}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
          isPlan ? 'bg-sky-100 text-sky-800' : 'text-gray-700 hover:bg-sky-50 hover:text-sky-700'
        }`}
      >
        <span>Plan</span>
      </Link>
      <Link
        href={`${base}/discover`}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
          isDiscover ? 'bg-sky-100 text-sky-800' : 'text-gray-700 hover:bg-sky-50 hover:text-sky-700'
        }`}
      >
        <span>Discover</span>
      </Link>
    </nav>
  )
}
