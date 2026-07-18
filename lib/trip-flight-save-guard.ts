import type { TripFlightFormRow } from '@/lib/trip-flight'
import { flightRowHasData } from '@/lib/trip-flight'

/** Returns true when a PUT would wipe existing flights without explicit intent. */
export function shouldRejectEmptyFlightReplace(
  rowsToSave: TripFlightFormRow[],
  clearFlights: boolean
): boolean {
  if (clearFlights) return false
  return rowsToSave.filter(flightRowHasData).length === 0
}
