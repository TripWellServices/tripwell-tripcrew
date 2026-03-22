/**
 * Experience / wishlist / planner URLs.
 * `tripCrewId === null` = traveler (personal) scope; otherwise crew-scoped.
 */

/** Preserve TripCrew context when redirecting to personal builder URLs. */
export function withPromoteToCrew(href: string, promoteToCrewId: string | null | undefined) {
  if (!promoteToCrewId?.trim()) return href
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}promoteToCrewId=${encodeURIComponent(promoteToCrewId.trim())}`
}
export function experienceHubPath(tripCrewId: string | null): string {
  return tripCrewId ? `/tripcrews/${tripCrewId}/experiences` : '/traveler/experiences'
}

export function experiencePaths(tripCrewId: string | null) {
  const hub = experienceHubPath(tripCrewId)
  return {
    hub,
    build: `${hub}/build`,
    find: `${hub}/find`,
    enter: `${hub}/enter`,
    wishlist: tripCrewId ? `/tripcrews/${tripCrewId}/wishlist` : '/traveler/wishlist',
    destinations: tripCrewId ? `/tripcrews/${tripCrewId}/destinations` : '/traveler/destinations',
    planFork: tripCrewId ? `/tripcrews/${tripCrewId}/plan` : '/traveler/plan',
    /** Direct trip form (no AI). From crew context, add ?promoteToCrewId= when linking. */
    planScratch: '/traveler/plan/scratch',
    planDestination: (mode: 'trip' | 'season', citySlug?: string) => {
      const base = tripCrewId
        ? `/tripcrews/${tripCrewId}/plan/destination`
        : '/traveler/plan/destination'
      const q = new URLSearchParams({ mode })
      if (citySlug) q.set('citySlug', citySlug)
      return `${base}?${q.toString()}`
    },
  }
}
