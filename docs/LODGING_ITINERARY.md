# Lodging and trip itineraries

## Current state (March 2026)

- **`Lodging`** is a first-class Prisma model scoped by `tripId` (one lodging per trip via unique `tripId`) and/or `tripWellEnterpriseId` for reusable catalogue rows.
- **`TripDayExperience`** schedules day-level items via nullable FKs: `hikeId`, `diningId`, `attractionId`, `concertId`, `sportId`, `adventureId`, `cruiseId`. There is **no `lodgingId`** yet.
- **Dining / Attraction** use `distanceFromLodging` as a float with **no FK** to a specific `Lodging` row.

## Recommended next integration (phase 2)

### Option A — Stays as experiences

- Add `lodgingId String?` to `TripDayExperience` with relation to `Lodging` and `@@index([lodgingId])`.
- Enforce at most one “stay” experience per `TripDay` if you want a simple mental model, or allow multiple for split stays.
- Extend `/api/trip/[tripId]/itinerary-items` (or equivalent) to accept `lodging` as an experience type alongside dining and attractions.
- **Pros:** Reuses existing day ordering, `startTime` / `endTime` for check-in/out hints.
- **Cons:** Mixes “places” (lodging) with “activities”; may need UI copy to distinguish.

### Option B — Dedicated itinerary item

- Introduce an `ItineraryItem` model with `lodgingId`, `diningId`, `attractionId`, dates, and optional `TripDay` link.
- Migrate `TripDayExperience` to reference `itineraryItemId` over time, or keep both during transition.
- **Pros:** Clear separation; matches comments in schema (`ItineraryItem.lodgingId`).
- **Cons:** Larger migration and API churn.

### API sketch (regardless of option)

- Support `itemType: 'lodging'` on itinerary PATCH/POST endpoints, symmetric with `'dining' | 'attraction'`.
- Optional: `lodgingIdFromTrip: true` to attach the trip’s primary `Trip.lodging` without duplicating IDs.

## Distance-from-lodging follow-up

- Add optional `lodgingId` on `Dining` / `Attraction` (or on trip-scoped rows only) so `distanceFromLodging` is unambiguous when a trip has multiple stays.
