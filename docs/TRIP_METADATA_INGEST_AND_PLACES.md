# Trip metadata, ingest, and Google Places

This note is the short map for the current backend/web app shape: where a trip's
identity and dates live, what can be opened in a mobile browser, and how
restaurants enter the system.

## Current app shape

- The repo is a Next.js App Router application backed by Prisma/PostgreSQL.
- Trip pages are web routes, so Safari or any mobile browser can open them.
- The mobile experience is browser-based, not a native shared mobile repo.
- The main trip page is view-oriented; editing happens through the setup/admin
  routes.

Useful routes:

| Route | Purpose |
| --- | --- |
| `/trip/[tripId]` | Read-mostly trip dashboard for a single trip ID. |
| `/trip/[tripId]/admin` | Setup/admin wizard for editing the trip. |
| `/trip/[tripId]/plan` | Itinerary-focused trip view. |
| `/trip/[tripId]/discover` | Discovery/catalogue view. |
| `/trip/setup` | Pre-trip ingest entry point for paste/CSV/manual setup. |

The route parameter `[tripId]` is the Prisma `Trip.id` UUID.

## Trip identity and metadata

The core trip record is `Trip` in `prisma/schema.prisma`.

Important fields:

| Field | What it means |
| --- | --- |
| `id` | UUID used in URLs as `/trip/[tripId]`. |
| `title` | Preferred display title. |
| `purpose` | Legacy/free-text trip description. |
| `city`, `state`, `country` | Destination fields still used by several views. |
| `startingLocation` | Origin/leaving-from text when available. |
| `startDate`, `endDate` | Trip window. |
| `daysTotal`, `season` | Persisted metadata derived from the dates. |
| `setupOrigin` | Distinguishes generic trips from concert-ingested trips. |
| `tripType` | `SINGLE_DAY` or `MULTI_DAY`. |

Date-derived metadata is calculated in `lib/trip/computeTripMetadata.ts`:

- `computeTripMetadata(startDate, endDate)` returns `daysTotal`, `dateRange`,
  and `season`.
- `tripPersistedMetadata(startDate, endDate)` returns the values stored on the
  `Trip` row: `daysTotal` and `season`.
- `tripDateRangeLabel(startDate, endDate)` is the UI label helper.

Title handling is also in `lib/trip/computeTripMetadata.ts`:

- `resolveTripTitle(title, purpose)` prefers explicit `title`.
- Legacy purpose blobs are split by `splitLegacyPurposeBlob(...)`.
- Concert-ingested titles can also be inferred via `lib/trip/inferTripTitle.ts`.

The main read path for the web app is `getTrip(tripId)` in
`lib/actions/trip.ts`. It loads the trip with its trip days, scheduled
experiences, lodging, dining, attractions, flights, and concert anchors.

## Montreal example currently in the repo

There is no checked-in "Shaggy to Montreal" trip fixture. The maintained
Montreal example is the Osheaga fixture in `lib/fixtures/osheaga-plan.ts`:

- Trip name: `Osheaga Montreal`
- Dates: `2026-07-31` to `2026-08-02`
- City: Montreal, QC, Canada
- Lodging: Fairmont The Queen Elizabeth
- Event anchor: Osheaga Music Festival at Parc Jean-Drapeau
- Dining slot: Schwartz Deli lunch on day 2

That fixture is useful for understanding the intended shape of a confirmed
Montreal trip, including dated itinerary slots.

## How plan ingest creates trip data

The primary "paste in what I already have" flow is:

1. User enters a blob/CSV/manual setup at `/trip/setup`.
2. `app/components/trip/setup/TripSetupIngest.tsx` posts to
   `POST /api/plan/parse-blob`.
3. Parsing returns a `ParsedTripPlan`.
4. The app posts the parsed plan to
   `POST /api/traveler/trips/ingest-plan`.
5. The ingest route creates:
   - the `Trip` shell (`title`, dates, city/state/country, origin fields),
   - `TripDay` rows for the date range,
   - lodging when provided,
   - concert anchors when provided,
   - dining/attraction wishlist rows from day slots,
   - `TripDayExperience` rows that schedule those items onto days.

The current scheduling model is `TripDayExperience`, not an older
`ItineraryItem` model referenced in some legacy docs.

## Where restaurants are ingested

Restaurants can enter the system through multiple paths.

| Path | Entry point | Storage behavior |
| --- | --- | --- |
| Parsed trip plan | `POST /api/traveler/trips/ingest-plan` | Dining day slots create `Dining` rows and scheduled `TripDayExperience` rows. |
| Manual add | `POST /api/dining` | Creates or updates dining records from user-entered fields. |
| Google Places search/hydrate | `POST /api/places/search` then `POST /api/hydrate/dining` | Uses Google Place Details and upserts `Dining` by `googlePlaceId`. |
| City catalogue | `GET /api/catalogue?type=dining` | Reads city-scoped `Dining`; selected items can be attached/hydrated. |
| Legacy StuffToDo | `POST /api/stuff-to-do` with restaurant type | Exists as a legacy/catalogue API; current docs indicate no main in-app ingest UI. |

The `Dining` model is in `prisma/schema.prisma`. Key fields include:

- `tripId`
- `cityId`
- `title`
- `category`
- `address`
- `phone`
- `website`
- `googlePlaceId`
- `imageUrl`
- `rating`
- `lat` / `lng`
- `distanceFromLodging`
- `driveTimeMinutes`
- `metadata`

Dining can be attached to an itinerary day through
`TripDayExperience.diningId`.

## Google Places restaurant flow

Google Places support is split into server-side search/details routes and a
client autocomplete component.

Key files:

| File | Role |
| --- | --- |
| `lib/google-places-config.ts` | Resolves Google Places/Maps API keys and error messages. |
| `app/api/places/search/route.ts` | Server-side text search endpoint. |
| `app/api/hydrate/dining/route.ts` | Place Details -> `Dining` upsert for restaurants. |
| `app/api/hydrate/lodging/route.ts` | Place Details -> lodging hydration. |
| `app/api/hydrate/attractions/route.ts` | Place Details -> attraction hydration. |
| `lib/google-places-hydrate.ts` | Shared Google Place Details helpers and metadata shaping. |
| `app/components/trip/GoogleSearchBar.tsx` | Browser autocomplete component using the Maps JavaScript API. |

`POST /api/hydrate/dining` requires:

- `placeId`
- `tripId`
- optional `categoryLabel`

It fetches Google Place Details, calculates distance/drive time when the trip
has lodging coordinates, then upserts `Dining` by `googlePlaceId`.

Required environment variables are documented in `README.md` and `SETUP.md`.
The relevant keys are:

- `GOOGLE_PLACES_API_KEY` for server-side Places calls.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` when browser autocomplete is used.

## What is viewable on Safari/mobile today

Because this is a web app, a mobile Safari user can open the trip routes
directly when they have a valid trip ID.

The most relevant URL is:

```text
/trip/[tripId]
```

For edits/setup:

```text
/trip/[tripId]/admin
```

There are responsive Tailwind classes throughout the UI, but the app still has
desktop-style sidebars in some shells. That means Safari can view/use it, but
the admin setup flow may feel cramped on a phone until the layout gets a
dedicated mobile navigation treatment.

## Quick answers

- Trip ID lives in `Trip.id` and is the URL segment in `/trip/[tripId]`.
- Trip dates live in `Trip.startDate` and `Trip.endDate`.
- Derived trip metadata is in `Trip.daysTotal` and `Trip.season`.
- Display date ranges are computed by `tripDateRangeLabel(...)`.
- Restaurants from pasted itinerary text are created during ingest as `Dining`
  plus scheduled `TripDayExperience` records.
- Google restaurant enrichment happens through `/api/places/search` and
  `/api/hydrate/dining`.
- The current in-repo Montreal example is Osheaga Montreal, not Shaggy to
  Montreal.
