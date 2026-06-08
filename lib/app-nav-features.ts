export type NavFeature = {
  id: string
  name: string
  path: string
  /** When true, pathname.startsWith(path) marks active (for nested routes). */
  prefix?: boolean
}

export type NavFeatureGroup = {
  id: string
  name: string
  features: NavFeature[]
}

export const NAV_FEATURE_GROUPS: NavFeatureGroup[] = [
  {
    id: 'experiences',
    name: 'Experiences',
    features: [
      {
        id: 'concerts',
        name: 'Concerts',
        path: '/experiences/concerts',
        prefix: true,
      },
    ],
  },
]

export const NAV_TOP_LEVEL: NavFeature[] = [
  { id: 'tripcrews', name: 'TripCrews', path: '/tripcrews', prefix: true },
  { id: 'my-trips', name: 'My Trips', path: '/my-trips', prefix: true },
]

export function isNavActive(
  pathname: string | null,
  path: string,
  prefix?: boolean
): boolean {
  if (!pathname) return false
  if (prefix) return pathname === path || pathname.startsWith(`${path}/`)
  return pathname === path
}

export function getActiveNavGroupId(pathname: string | null): string | null {
  if (!pathname) return null
  for (const group of NAV_FEATURE_GROUPS) {
    if (
      group.features.some((f) => isNavActive(pathname, f.path, f.prefix))
    ) {
      return group.id
    }
  }
  return null
}
