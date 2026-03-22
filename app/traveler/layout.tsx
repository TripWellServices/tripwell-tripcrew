import PromoteCrewBanner from '@/app/components/layout/PromoteCrewBanner'
import { Suspense } from 'react'

export default function TravelerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PromoteCrewBanner />
      </Suspense>
      {children}
    </>
  )
}
