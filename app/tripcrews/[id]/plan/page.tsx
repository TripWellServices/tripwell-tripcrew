import { redirect } from 'next/navigation'

export default async function TripCrewPlanForkRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/traveler/plan?promoteToCrewId=${encodeURIComponent(id)}`)
}
