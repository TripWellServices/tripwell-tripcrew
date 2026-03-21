'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import HikePasteClient from './HikePasteClient'

/**
 * Standalone /hikes/new: if ?return= starts with /tripcrews/:id, redirect to
 * /tripcrews/:id/hikes/new so TripCrewLayout (sidebar) stays visible.
 */
function RedirectGate({ children }: { children: React.ReactNode }) {
  const sp = useSearchParams()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const ret = sp.get('return') ?? ''
    const m = ret.match(/^\/tripcrews\/([^/]+)/)
    if (m) {
      const crewId = m[1]
      const q = sp.toString()
      router.replace(`/tripcrews/${crewId}/hikes/new${q ? `?${q}` : ''}`)
      return
    }
    setReady(true)
  }, [sp, router])

  if (!ready) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 text-gray-500 text-sm">
        Loading…
      </div>
    )
  }
  return <>{children}</>
}

export default function HikeNewEntry() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-6 py-10 text-gray-500 text-sm">
          Loading…
        </div>
      }
    >
      <RedirectGate>
        <HikePasteClient />
      </RedirectGate>
    </Suspense>
  )
}
