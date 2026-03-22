import { redirect } from 'next/navigation'

export default async function TripCrewExperiencesEnterRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/traveler/experiences/enter?promoteToCrewId=${encodeURIComponent(id)}`)
}
