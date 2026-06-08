/**
 * Experience / wishlist / planner URLs (flat app routes).
 */

export function experienceHubPath(): string {
  return '/experiences/concerts'
}

export function concertsListPath(): string {
  return '/experiences/concerts'
}

export function concertsIngestPath(): string {
  return '/experiences/concerts/ingest'
}

export function experiencePaths() {
  const concertsList = concertsListPath()
  const concertsIngest = concertsIngestPath()
  return {
    hub: '/experiences',
    concertsList,
    concertsIngest,
    build: '/experiences/build',
    find: '/experiences/find',
    enter: '/experiences/enter',
    wishlist: '/wishlist',
    destinations: '/destinations',
    planFork: concertsIngest,
    planGotPlan: concertsIngest,
    planDestination: (mode: 'trip' | 'season', citySlug?: string) => {
      const base = '/plan/destination'
      const q = new URLSearchParams({ mode })
      if (citySlug) q.set('citySlug', citySlug)
      return `${base}?${q.toString()}`
    },
  }
}
