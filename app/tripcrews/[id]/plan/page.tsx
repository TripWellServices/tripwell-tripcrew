import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PlanPageRedirect({ params }: PageProps) {
  const { id } = await params
  redirect(`/tripcrews/${id}/plan/destination`)
}
