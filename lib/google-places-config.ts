/**
 * Resolve Google Places / Maps API key from env.
 * Vercel may use NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; server routes accept either name.
 */
export function resolveGooglePlacesApiKey(): string | null {
  const candidates = [
    process.env.GOOGLE_PLACES_API_KEY,
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    process.env.GOOGLE_MAPS_API_KEY,
  ]
  for (const value of candidates) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

export function googlePlacesConfigured(): boolean {
  return Boolean(resolveGooglePlacesApiKey())
}

/** User-facing hint when Places is missing. */
export const GOOGLE_PLACES_ENV_HINT =
  'Set GOOGLE_PLACES_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Vercel (Production), then redeploy.'

/**
 * Map Google Places legacy API status to a short client-safe message.
 * Logs full status + error_message server-side when present.
 */
export function googlePlacesErrorMessage(
  status: string | undefined,
  errorMessage?: string | null
): string {
  if (errorMessage?.trim()) {
    console.error('Google Places API:', status, errorMessage)
  }
  switch (status) {
    case 'REQUEST_DENIED':
      return errorMessage?.includes('referer')
        ? 'Google API key blocked for server requests — use an unrestricted server key or disable HTTP referrer restriction for /api/places routes.'
        : 'Google API key rejected — check billing, enabled APIs (Places API, Maps JavaScript API), and key restrictions in Google Cloud Console.'
    case 'OVER_QUERY_LIMIT':
      return 'Google Places quota exceeded — try again later or raise quota in Google Cloud Console.'
    case 'INVALID_REQUEST':
      return 'Invalid Places request.'
    case 'ZERO_RESULTS':
      return 'No results found.'
    default:
      return errorMessage?.trim() || 'Google Places request failed.'
  }
}
