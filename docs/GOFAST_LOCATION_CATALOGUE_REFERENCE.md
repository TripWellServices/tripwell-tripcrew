# GoFast Location Catalogue — Reference (for TripWell)

**Where it lives:** `gofastapp-mvp` (schema) + `GoFastCompany` (vision doc, AI generate, stub-on-save). Not in gofastbackendv2-fall2025; the “location as library” and OpenAI tie-in are in the app-mvp schema and GoFastCompany docs/routes.

---

## What GoFast did: run_locations = location library

**Schema (gofastapp-mvp):**

```prisma
// Route/location catalogue. Created manually or auto-seeded from run meetUpPoint/title.
// Raw on creation (just name + gofastCity); attributes filled in over time.
model run_locations {
  id          String         @id @default(cuid())
  gofastCity  String         // "dc", "arlington" — city slug
  name        String         // "Haines Point", "Custis Trail"
  slug        String         @unique  // e.g. "dc-haines-point"
  runType     String?        // "park" | "track" | "trail" | "neighborhood"
  shape       RouteShape?
  terrain     RouteTerrain?
  surface     RouteSurface?
  traffic     RouteTraffic?
  lighting    RouteLighting?
  shade       RouteShade?
  vibes       RouteVibe[]     @default([])
  loopMiles   Float?
  notes       String?         // editorial
  stravaUrl   String?
  meetUpPoint String?
  city_runs   city_runs[]    // runs that use this location
}
```

So **location is a library object**: one row per named place (per city). Runs reference it via `city_runs.locationId → run_locations.id`.

---

## How the catalogue is built (no OpenAI to “catalogue city”)

From **GoFastCompany/docs/RUN_LOCATION_CATALOGUE_VISION.md**:

1. **MVP1 (live):** Staff types a **“Named location”** on the run form (e.g. “Haines Point”). On **save**, the backend:
   - Builds a city-scoped slug (e.g. `dc-haines-point`)
   - **Upserts** a `run_locations` row (gofastCity + name + slug; rest null = “stub”)
   - Sets `city_run.locationId` to that row  
   So the catalogue grows from **real runs** (stub-on-save), not from an OpenAI “catalogue this city” call.

2. **OpenAI’s role:** The **ai-generate** endpoint (`/api/runs/ai-generate`) gets `runLocationName` and injects it into the prompt as `[RUN LOCATION - named venue]` so the AI can write better run descriptions. So OpenAI **uses** the location name (and in MVP3 vision would use the full catalogue row), but it doesn’t **create** the catalogue rows.

3. **MVP2 (vision):** Internal UI to **enrich** stubs (shape, terrain, surface, notes, etc.).

4. **MVP3 (vision):** AI generate receives `locationId`, loads the full `run_locations` row, and injects it as structured context so descriptions compound for known venues.

So the “crazy” part is: **location as a reusable catalogue** (run_locations) + **stub-on-save** (no dropdown, one text field) + **AI that uses the name today and the full row in the vision**. There isn’t a separate “OpenAI call to catalogue city” that creates locations; the catalogue is created when staff saves runs with a named location.

---

## TripWell today

We have **no** location/place library. Lodging, Dining, Attraction each have their own address/lat/lng/googlePlaceId — repeated, not a shared “Location” or “Place” table. So we never did the “location as library object” or “catalogue city” pattern in TripWell schema. If we ever add a Destination or artifact layer that should be reusable and optionally enriched (or later fed to AI), the GoFast **run_locations** + **RUN_LOCATION_CATALOGUE_VISION** pattern is the reference: stub-on-save, optional enrichment, optional AI context from the catalogue.
