'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface TripNavProps {
  tripId: string
}

export default function TripNav({ tripId }: TripNavProps) {
  const pathname = usePathname()
  const base = `/trip/${tripId}`

  const isSetup = pathname === `${base}/admin`
  const isItinerary = pathname === `${base}/plan`
  const isDiscover = pathname === `${base}/discover`

  const tabClass = (active: boolean) =>
    `shrink-0 lg:w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
      active
        ? 'bg-sky-100 text-sky-800'
        : 'text-gray-700 hover:bg-sky-50 hover:text-sky-700'
    }`

  return (
    <nav className="p-2 flex gap-2 overflow-x-auto border-b border-gray-200 lg:block lg:space-y-1">
      <Link href={`${base}/admin`} className={tabClass(isSetup)}>
        <span>Details</span>
      </Link>
      <Link href={`${base}/plan`} className={tabClass(isItinerary)}>
        <span>Itinerary</span>
      </Link>
      <Link href={`${base}/discover`} className={tabClass(isDiscover)}>
        <span>Experiences</span>
      </Link>
    </nav>
  )
}
