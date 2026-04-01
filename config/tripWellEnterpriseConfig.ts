/**
 * TripWell Enterprise — single-tenant default for this app.
 *
 * Set `TRIPWELL_ENTERPRISE_ID` in the environment to match the `TripWellEnterprise.id`
 * row in your database (see migrations / seed). If unset, the fallback below is used
 * so local and historic DBs keep working.
 */

/** Matches legacy migration default [`001_fix_tripwell_enterprises`](prisma/migrations/001_fix_tripwell_enterprises.ts). */
export const TRIPWELL_ENTERPRISE_ID = 'tripwell-enterprises-master-container'

export const getTripWellEnterpriseId = (): string => {
  const fromEnv = process.env.TRIPWELL_ENTERPRISE_ID?.trim()
  if (fromEnv) return fromEnv
  return TRIPWELL_ENTERPRISE_ID
}

/**
 * Artifact creates: use explicit ID from the client when provided (e.g. tests);
 * otherwise the configured default enterprise.
 */
export function resolveTripWellEnterpriseId(
  explicit?: string | null
): string {
  const t = typeof explicit === 'string' ? explicit.trim() : ''
  if (t) return t
  return getTripWellEnterpriseId()
}

export default {
  TRIPWELL_ENTERPRISE_ID,
  getTripWellEnterpriseId,
  resolveTripWellEnterpriseId,
}
