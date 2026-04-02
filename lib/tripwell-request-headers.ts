/**
 * Browser sends this on hydrate (and can send on other API calls); server reads it with
 * `requireTravelerFromBearer` — same pattern as GoFast `ATHLETE_ID_HEADER` / `requireAthleteFromBearer`.
 */
export const TRAVELER_ID_HEADER = 'x-traveler-id'
