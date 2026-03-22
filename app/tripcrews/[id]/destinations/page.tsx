import { redirect } from 'next/navigation'

export default async function TripCrewDestinationsRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/traveler/destinations?promoteToCrewId=${encodeURIComponent(id)}`)
}
