/**
 * Experience / wishlist / planner URLs (flat app routes).
 */

export function experienceHubPath(): string {
  return '/experiences'
}

export function experiencePaths() {
  const hub = experienceHubPath()
  return {
    hub,
    build: `${hub}/build`,
    find: `${hub}/find`,
    enter: `${hub}/enter`,
    wishlist: '/wishlist',
    destinations: '/destinations',
    planFork: '/plan',
    planScratch: '/plan/scratch',
    planDestination: (mode: 'trip' | 'season', citySlug?: string) => {
      const base = '/plan/destination'
      const q = new URLSearchParams({ mode })
      if (citySlug) q.set('citySlug', citySlug)
      return `${base}?${q.toString()}`
    },
  }
}
