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
   * Get full invite URL for a join code
   */
  getInviteUrl: (code: string) => {
    return `${appConfig.baseUrl}/join?code=${encodeURIComponent(code)}`
  },
}

