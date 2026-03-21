import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string }>
}

export default async function PlanPageRedirect({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const q = sp.mode === 'city' ? '?mode=city' : ''
  redirect(`/tripcrews/${id}/experiences/build${q}`)
}
