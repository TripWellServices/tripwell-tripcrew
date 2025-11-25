/**
 * TripWell Enterprise Config
 * 
 * Single-tenant configuration for TripWell Enterprise.
 * Since there's only ONE TripWell Enterprise, we hardcode the ID.
 * 
 * This ID is set once when the enterprise is first created and lives forever.
 */

export const TRIPWELL_ENTERPRISE_ID = 'tripwell-enterprises-master-container'

/**
 * Get TripWell Enterprise ID (single tenant - hardcoded)
 * @returns {string} The TripWell Enterprise ID
 */
export const getTripWellEnterpriseId = () => {
  return TRIPWELL_ENTERPRISE_ID
}

export default {
  TRIPWELL_ENTERPRISE_ID,
  getTripWellEnterpriseId,
}

