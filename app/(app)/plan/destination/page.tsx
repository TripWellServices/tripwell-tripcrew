import { redirect } from 'next/navigation'
import { concertsIngestPath } from '@/lib/experience-routes'

export default function PlanDestinationRedirectPage() {
  redirect(concertsIngestPath())
}
