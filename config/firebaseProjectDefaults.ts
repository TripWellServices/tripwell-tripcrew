/**
 * Default Firebase project id when env vars are unset.
 * Must match the fallbacks in `lib/firebase.ts` (client config).
 * GoFast uses an in-code company id; TripWell uses this for Admin ADC fallback projectId only.
 */
export const TRIPWELL_FIREBASE_PROJECT_ID_DEFAULT = 'tripwell-794c9'

export function getDefaultFirebaseProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    TRIPWELL_FIREBASE_PROJECT_ID_DEFAULT
  )
}
