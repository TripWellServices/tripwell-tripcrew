import { redirect } from 'next/navigation'

interface PageProps {
  params: { tripId: string }
}

export default function TripDiscoverRedirectPage({ params }: PageProps) {
  redirect(`/trip/${params.tripId}/admin`)
}
