'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import HikeDayPlanClient from './HikeDayPlanClient'

function RedirectGate({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const sp = useSearchParams()
  const router = useRouter()
  const hikeId = params.id as string
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const ret = sp.get('return') ?? ''
    const m = ret.match(/^\/tripcrews\/([^/]+)/)
    if (m && hikeId) {
      const crewId = m[1]
      const q = sp.toString()
      router.replace(
        `/tripcrews/${crewId}/hikes/${hikeId}/day-plan${q ? `?${q}` : ''}`
      )
      return
    }
    setReady(true)
  }, [sp, router, hikeId])

  if (!ready) {
    return (
      <div className="max-w-lg mx-auto px-6 py-10 text-gray-500 text-sm">
        Loading…
      </div>
    )
  }
  return <>{children}</>
}

export default function HikeDayPlanEntry() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-6 py-10 text-gray-500 text-sm">
          Loading…
        </div>
      }
    >
      <RedirectGate>
        <HikeDayPlanClient />
      </RedirectGate>
    </Suspense>
  )
}
