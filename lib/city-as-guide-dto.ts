import type { City, Traveler } from '@prisma/client'

/** API shape for a city that has a destination guide (citySlug set). Matches former CityGuide JSON + nested city. */
export type CityGuideResponse = {
  id: string
  citySlug: string
  tagline: string | null
  description: string | null
  bestTimeToVisit: string | null
  attractionNames: string[]
  imageUrl: string | null
  city: { id: string; name: string; state: string | null; country: string | null }
  createdBy: { id: string; firstName: string | null; lastName: string | null } | null
}

type CityWithAuthor = City & {
  guideCreatedBy?: Pick<Traveler, 'id' | 'firstName' | 'lastName'> | null
}

export function cityToGuideDto(city: CityWithAuthor): CityGuideResponse | null {
  if (!city.citySlug) return null
  return {
    id: city.id,
    citySlug: city.citySlug,
    tagline: city.tagline,
    description: city.description,
    bestTimeToVisit: city.bestTimeToVisit,
    attractionNames: city.attractionNames ?? [],
    imageUrl: city.imageUrl,
    city: {
      id: city.id,
      name: city.name,
      state: city.state,
      country: city.country,
    },
    createdBy: city.guideCreatedBy
      ? {
          id: city.guideCreatedBy.id,
          firstName: city.guideCreatedBy.firstName,
          lastName: city.guideCreatedBy.lastName,
        }
      : null,
  }
}

export const cityGuideInclude = {
  guideCreatedBy: { select: { id: true, firstName: true, lastName: true } },
} as const
