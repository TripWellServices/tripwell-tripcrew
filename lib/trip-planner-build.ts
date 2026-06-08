/**
 * Future trip planner builder — turns ingested source objects into scheduled itinerary.
 * Pass 2 only ingests fixed anchors and wishlist FKs; day placement is a later phase.
 */

export type TripPlannerAnchorKind = 'concert' | 'concert_schedule_item'

export type TripPlannerWishlistKind =
  | 'attraction'
  | 'dining'
  | 'hike'
  | 'other'

export type TripPlannerBuildInput = {
  tripId: string
  daysTotal: number
  tripStartDate: string
  tripEndDate: string
  fixedAnchors: Array<{
    kind: TripPlannerAnchorKind
    id: string
    startsAt: string
    endsAt?: string | null
  }>
  lodgingIds: string[]
  wishlist: Array<{
    kind: TripPlannerWishlistKind
    id: string
    priority?: number
  }>
}

export type TripPlannerBuildResult = {
  tripId: string
  status: 'not_implemented'
  message: string
}

/** Stub — downstream builder generates TripDay / TripDayExperience from constraints. */
export async function buildTripPlanFromIngest(
  _input: TripPlannerBuildInput
): Promise<TripPlannerBuildResult> {
  return {
    tripId: _input.tripId,
    status: 'not_implemented',
    message:
      'Trip planner builder is not implemented in Pass 2. Ingest fixed anchors and wishlist first.',
  }
}
