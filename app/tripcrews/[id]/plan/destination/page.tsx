import { redirect } from 'next/navigation'

export default async function TripCrewPlanDestinationRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const q = new URLSearchParams()
  q.set('promoteToCrewId', id)
  const mode = sp.mode
  if (typeof mode === 'string') q.set('mode', mode)
  const citySlug = sp.citySlug
  if (typeof citySlug === 'string') q.set('citySlug', citySlug)
  const slug = sp.slug
  if (typeof slug === 'string') q.set('slug', slug)
  redirect(`/traveler/plan/destination?${q.toString()}`)
}
