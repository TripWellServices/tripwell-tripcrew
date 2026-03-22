import { redirect } from 'next/navigation'

export default async function TripCrewExperiencesRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/traveler/experiences?promoteToCrewId=${encodeURIComponent(id)}`)
}
