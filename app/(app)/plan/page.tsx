import { redirect } from 'next/navigation'
import { tripSetupIngestPath } from '@/lib/experience-routes'

export default function PlanRedirectPage() {
  redirect(tripSetupIngestPath())
}
