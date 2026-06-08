import { redirect } from 'next/navigation'
import { concertsIngestPath } from '@/lib/experience-routes'

export default function PlanRedirectPage() {
  redirect(concertsIngestPath())
}
