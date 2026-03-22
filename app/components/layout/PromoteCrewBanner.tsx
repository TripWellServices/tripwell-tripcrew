'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LocalStorageAPI } from '@/lib/localStorage'

/**
 * Shown on traveler builder pages when opened from a TripCrew (promoteToCrewId).
 */
export default function PromoteCrewBanner() {
  const searchParams = useSearchParams()
  const crewId = searchParams.get('promoteToCrewId')
  const [crewName, setCrewName] = useState<string | null>(null)

  useEffect(() => {
    if (!crewId) return
    const tid = LocalStorageAPI.getTravelerId()
    if (!tid) return
    let cancelled = false
    fetch(`/api/tripcrew?travelerId=${encodeURIComponent(tid)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.success || !Array.isArray(data.tripCrews)) return
        const crews = data.tripCrews as Array<{ id: string; name: string | null }>
        const match = crews.find((c) => c.id === crewId)
        if (!cancelled && match?.name) setCrewName(match.name)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [crewId])

  if (!crewId) return null

  const label = crewName ? `“${crewName}”` : 'your TripCrew'

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="max-w-3xl mx-auto">
        <span className="font-semibold">Building on your personal account.</span> Avoid crew collisions by
        finishing here first, then share or attach to {label} when you&apos;re ready.{' '}
        <Link href={`/tripcrews/${crewId}`} className="font-medium text-sky-700 hover:underline">
          Back to crew
        </Link>
      </p>
    </div>
  )
}
