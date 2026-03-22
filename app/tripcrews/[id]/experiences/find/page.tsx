import { redirect } from 'next/navigation'

export default async function TripCrewExperiencesFindRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/traveler/experiences/find?promoteToCrewId=${encodeURIComponent(id)}`)
}
