/**
 * TripWell Enterprise — single-tenant default for this app (same idea as GoFast `GOFAST_COMPANY_ID`
 * in `gofastapp-mvp/lib/goFastCompanyConfig.ts`).
 *
 * One canonical id for the deployment; `TravelerFindOrCreateService` connects travelers to
 * this id only — it does not discover tenant by name.
 *
 * Set `TRIPWELL_ENTERPRISE_ID` to match the `TripWellEnterprise.id` in your DB when it differs
 * from the default below. If unset, the fallback keeps local / historic DBs working.
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
