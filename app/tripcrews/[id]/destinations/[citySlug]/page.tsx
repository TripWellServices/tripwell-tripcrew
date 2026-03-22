import { redirect } from 'next/navigation'

export default async function TripCrewDestinationGuideRedirectPage({
  params,
}: {
  params: Promise<{ id: string; citySlug: string }>
}) {
  const { id, citySlug } = await params
  redirect(
    `/traveler/destinations/${encodeURIComponent(citySlug)}?promoteToCrewId=${encodeURIComponent(id)}`
  )
}
