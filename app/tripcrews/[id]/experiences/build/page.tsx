import { redirect } from 'next/navigation'

export default async function TripCrewExperiencesBuildRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/traveler/experiences/build?promoteToCrewId=${encodeURIComponent(id)}`)
}
