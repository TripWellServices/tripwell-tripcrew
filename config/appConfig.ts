/**
 * App Configuration
 * 
 * Centralized configuration for TripWell TripCrew app
 */

export const appConfig = {
  /**
   * Base URL for the application
   * Used for generating invite links and absolute URLs
   */
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://tripcrew.tripwell.app',

  /**
   * Get full invite URL (GoFast-style: handle/slug in path, or legacy join code)
   * Share this link; opener signs in if needed and is redirected back to join.
   * Use handle (lowercase slug) for new crews, or joinCode (uppercase) for legacy.
   */
  getInviteUrl: (slugOrCode: string) => {
    const s = slugOrCode.trim()
    // If it looks like a handle (lowercase, hyphens), use as-is; else treat as code (uppercase)
    const pathSegment =
      s === s.toLowerCase() && /^[a-z0-9-]+$/.test(s)
        ? s
        : s.toUpperCase()
    return `${appConfig.baseUrl}/join/${encodeURIComponent(pathSegment)}`
  },
}

