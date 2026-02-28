# Whiteboard / Pre-Trip: “We Might Go Somewhere”

**Idea:** Before you have a trip (dates, destination locked), the crew has a **whiteboard** in “main” — a place to throw out ideas (“Virginia Beach”, “Beach weekend”, “Somewhere warm”) and vote on them. That’s the starting point; creating a trip comes later when you’ve narrowed it down or decided.

---

## 1. Where this lives

| Layer | What it is | Where it lives |
|-------|------------|----------------|
| **Whiteboard (pre-trip)** | “We might go somewhere” — suggested cities, regions, themes | **TripCrew** (crew-level). No trip yet. |
| **Trip** | We’re going to X, these dates; itinerary (dining, attractions, etc.) | **Trip** (belongs to TripCrew). Created when you lock in or decide from the whiteboard. |

So the **main** view for a TripCrew can be:

1. **Whiteboard** – “Where might we go?” Suggestions (cities, ideas) → crew votes → maybe “Create trip from this” or “Lock in.”
2. **Trips** – The trips we’ve actually created (e.g. “Thanksgiving 2025” for Virginia Beach).

---

## 2. UX flow (whiteboard-first)

1. **Crew home / main** – “Where might we go?” with a list of suggestions (e.g. “Virginia Beach”, “Asheville”, “Beach somewhere”).
2. **Suggest** – Any member adds a city or idea (free text or “suggest city” with optional autocomplete).
3. **Vote** – Crew votes yes/no (or thumbs up/down) on each suggestion.
4. **Discuss** – Optional comments on a suggestion (e.g. “We did VB last year”, “Asheville has great fall colors”).
5. **Lock in / Create trip** – From a suggestion (e.g. “Virginia Beach”): “Create trip” pre-fills destination and maybe creates the trip so you then add dates, lodging, itinerary items. Or you just “lock in” as “we’re doing this” and create the trip in a separate step.

So the flow is: **whiteboard (suggest + vote) → optional lock in → create trip (with destination/idea from whiteboard)**. Setting the trip (dates, lodging, itinerary) comes *after* that, not before.

---

## 3. Suggested schema (crew-level whiteboard)

Everything below is **TripCrew-scoped** (no `tripId`).

**Ideas/suggestions (whiteboard items):**

```prisma
enum WhiteboardItemKind {
  CITY        // e.g. "Virginia Beach", "Asheville"
  REGION      // e.g. "Outer Banks", "Blue Ridge"
  THEME       // e.g. "Beach weekend", "Somewhere warm"
  FREEFORM    // Other
}

enum WhiteboardItemStatus {
  OPEN       // Being discussed / voted on
  LOCKED_IN  // Crew decided; can "Create trip from this"
  DROPPED    // Rejected or removed
}

model WhiteboardItem {
  id            String               @id @default(uuid())
  tripCrewId    String
  kind          WhiteboardItemKind   @default(FREEFORM)
  title         String               // "Virginia Beach", "Beach weekend", etc.
  suggestedById String
  status        WhiteboardItemStatus @default(OPEN)
  tripId        String?              // Set when "Create trip from this" — links to the created Trip
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  tripCrew     TripCrew              @relation(...)
  suggestedBy  Traveler              @relation(...)
  trip         Trip?                 @relation(...)  // Optional: trip created from this idea
  comments     WhiteboardComment[]
  votes        WhiteboardVote[]
}
```

**Comments and votes (same pattern as itinerary):**

```prisma
model WhiteboardComment {
  id              String   @id @default(uuid())
  whiteboardItemId String
  travelerId      String
  body            String
  createdAt       DateTime @default(now())
  // relations
}

model WhiteboardVote {
  id              String   @id @default(uuid())
  whiteboardItemId String
  travelerId      String
  vote            String   // "yes" | "no"
  createdAt       DateTime @default(now())
  @@unique([whiteboardItemId, travelerId])
  // relations
}
```

**TripCrew** gets:

```prisma
model TripCrew {
  // ...existing fields...
  whiteboardItems WhiteboardItem[]
}
```

**Trip** (optional) can reference the idea it came from:

```prisma
model Trip {
  // ...existing fields...
  createdFromWhiteboardId String?  // Optional FK to WhiteboardItem
}
```

---

## 4. “Main” vs “Trip” views

- **Main (crew home):**  
  - “Where might we go?”  
  - List of `WhiteboardItem` (OPEN, maybe LOCKED_IN) with vote counts and “Create trip” on locked items.  
  - “Suggest a city or idea” → add `WhiteboardItem`.  
  - Optional: “Trips” section below or in a tab (existing trips for this crew).

- **Trip view (existing):**  
  - Once a trip exists (created from whiteboard or created manually), you have the current trip UI: dates, lodging, dining, attractions, itinerary, voting on itinerary items.

So “suggest cities and vote” lives on the **whiteboard** in main; “suggest restaurants/attractions and vote” can live on the **trip** (itinerary items) once you have a trip.

---

## 5. Summary

| Concept | Scope | Purpose |
|--------|--------|--------|
| **Whiteboard** | TripCrew | “We might go somewhere” — suggest cities/ideas, vote, comment, lock in, then optionally create trip. |
| **WhiteboardItem** | One row per suggestion | kind (CITY / REGION / THEME / FREEFORM), title, status (OPEN / LOCKED_IN / DROPPED), optional link to created Trip. |
| **WhiteboardVote** | Per traveler per item | yes/no. |
| **WhiteboardComment** | Per item | Discussion. |
| **Trip** | After whiteboard (or ad hoc) | Destination, dates, itinerary (dining, attractions, etc.); can be created “from” a WhiteboardItem. |

This keeps the whiteboard clearly **before** the trip and makes “suggest cities, vote, then set trip” the natural flow.

---

## 6. Miro-style board + “Where do you want to go?” AI parse

For a **board** with **Considering → Confirmed** columns and **pasting a list** (e.g. “summer concerts”) that **AI parses into cards**, see **`docs/MIRO_BOARD_AND_AI_PARSE.md`**. That doc covers: stages (Considering | Confirmed | Dropped), rich cards (title, dates, location, venue, notes), “Where do you want to go?” paste → AI parse → save, and GoFast-style APIs.
