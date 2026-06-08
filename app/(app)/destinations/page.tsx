import { redirect } from 'next/navigation'
import { concertsListPath } from '@/lib/experience-routes'

export default function DestinationsRedirectPage() {
  redirect(concertsListPath())
}
