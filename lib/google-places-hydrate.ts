/** Google Places API (legacy) helpers for server-side hydrate routes. */

export const GOOGLE_PLACE_DETAILS_FIELDS = [
  'name',
  'formatted_address',
  'formatted_phone_number',
  'website',
  'rating',
  'photos',
  'geometry',
  'types',
  'editorial_summary',
  'price_level',
  'opening_hours',
  'user_ratings_total',
  'reviews',
  'business_status',
  'url',
].join(',')

export type GooglePlaceReview = {
  author_name?: string
  rating?: number
  text?: string
  relative_time_description?: string
}

export type GooglePlaceResult = {
  name?: string
  formatted_address?: string
  formatted_phone_number?: string
  website?: string
  rating?: number
  photos?: { photo_reference?: string }[]
  geometry?: { location?: { lat?: number; lng?: number } }
  types?: string[]
  editorial_summary?: { overview?: string }
  price_level?: number
  opening_hours?: {
    open_now?: boolean
    weekday_text?: string[]
  }
  user_ratings_total?: number
  reviews?: GooglePlaceReview[]
  business_status?: string
  url?: string
}

export function priceLevelToCostLevel(priceLevel: number | undefined): number | undefined {
  if (typeof priceLevel !== 'number' || !Number.isFinite(priceLevel)) return undefined
  return Math.min(5, Math.max(1, Math.round((priceLevel + 1) * 1.25)))
}

function trimReviews(reviews: GooglePlaceReview[] | undefined, max = 5): GooglePlaceReview[] {
  if (!Array.isArray(reviews)) return []
  return reviews.slice(0, max).map((r) => ({
    author_name: r.author_name,
    rating: r.rating,
    text: typeof r.text === 'string' ? r.text.slice(0, 500) : undefined,
    relative_time_description: r.relative_time_description,
  }))
}

/** Fields merged into experience `metadata` (alongside AI/user keys). */
export function googlePlaceMetadataPatch(place: GooglePlaceResult): Record<string, unknown> {
  const overview =
    place.editorial_summary &&
    typeof place.editorial_summary === 'object' &&
    typeof place.editorial_summary.overview === 'string'
      ? place.editorial_summary.overview.trim()
      : undefined

  const patch: Record<string, unknown> = {
    google_types: place.types ?? [],
    google_business_status: place.business_status ?? null,
    google_maps_url: place.url ?? null,
    google_price_level:
      typeof place.price_level === 'number' && Number.isFinite(place.price_level)
        ? place.price_level
        : null,
    google_user_ratings_total:
      typeof place.user_ratings_total === 'number' && Number.isFinite(place.user_ratings_total)
        ? place.user_ratings_total
        : null,
    google_opening_hours: place.opening_hours
      ? {
          open_now: place.opening_hours.open_now ?? null,
          weekday_text: place.opening_hours.weekday_text ?? [],
        }
      : null,
    google_reviews: trimReviews(place.reviews),
    google_editorial_summary: overview ?? null,
    google_hydrated_at: new Date().toISOString(),
  }

  const cl = priceLevelToCostLevel(place.price_level)
  if (cl !== undefined) {
    patch.cost_level = cl
  }

  return patch
}

export function mergeExperienceMetadata(
  existing: unknown,
  googlePatch: Record<string, unknown>
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {}
  return { ...base, ...googlePatch }
}

/** Prefer keeping an existing user/AI description; fill from Google when empty. */
export function pickDescriptionAfterHydrate(
  existingDescription: string | null | undefined,
  place: GooglePlaceResult
): string | null {
  const ex = existingDescription?.trim()
  if (ex) {
    return existingDescription ?? ex
  }
  const overview =
    place.editorial_summary &&
    typeof place.editorial_summary === 'object' &&
    typeof place.editorial_summary.overview === 'string'
      ? place.editorial_summary.overview.trim()
      : ''
  return overview || null
}

export function buildPlaceDetailsUrl(placeId: string, apiKey: string): string {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: GOOGLE_PLACE_DETAILS_FIELDS,
    key: apiKey,
  })
  return `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
}
