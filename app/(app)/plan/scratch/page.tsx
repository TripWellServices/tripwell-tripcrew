import { redirect } from 'next/navigation'

/** @deprecated Use /plan/got-plan — kept for bookmarks and old links. */
export default function PlanScratchRedirectPage() {
  redirect('/plan/got-plan')
}
