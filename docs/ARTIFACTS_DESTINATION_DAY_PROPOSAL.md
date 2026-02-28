# Artifacts, Destination, and Day — Deeper Model

**Problem with current bolt-ons:** Lodging, Dining, Attraction are **tied to one trip**. In reality they’re **reusable artifacts** (the same hotel or restaurant can appear on multiple trips). Trip is overloaded; “day” is a heavy concept. For MVP1 we want: **artifacts reusable**, **Destination** as the real bolt-on (multi-city), **lean Trip**, and **day** as enum or date on **ItineraryItem**, not its own entity.

---

## 1. Lodging / Dining / Attraction = artifacts (reusable)

**Idea:** These are **things in the world** that can be used on many trips, not owned by a single trip.

- **Lodging** = a place (hotel, rental). Same lodging can be “we’re staying here on Trip A and Trip B.”
- **Dining** = a restaurant. Same restaurant can be on multiple trips.
- **Attraction** = a venue/activity. Same attraction can be on multiple trips.

So they should **not** have `tripId` as the only link. Options:

- **A) Artifacts at Enterprise (or global)**  
  Lodging, Dining, Attraction live as **artifact** tables (no tripId). They’re reusable. When you want “this trip uses this hotel,” you **link** trip (or itinerary item) to the artifact — e.g. **ItineraryItem** has optional `lodgingId`, `diningId`, `attractionId`, and the artifact rows are shared.

- **B) Artifacts at Crew**  
  Same idea but artifacts are scoped to TripCrew (so “our crew’s saved places”). Still reusable across that crew’s trips.

- **C) Copy-on-use**  
  Keep current model (each trip has its own Dining rows, etc.) but add a “template” or “artifact” layer later that you “add to trip” and it creates a copy. Simpler short-term, but doesn’t fix “same place, multiple trips.”

**Recommendation for MVP1:** Treat **Lodging, Dining, Attraction as artifacts** (option A or B): own tables with **no** required `tripId`. **ItineraryItem** is the thing that belongs to a **trip** and can **reference** an artifact (optional `lodgingId`, `diningId`, `attractionId`). So “dinner at X on this trip” = one ItineraryItem per trip, with `diningId` pointing at the shared Dining artifact. Same lodging can be referenced by many items (or by a trip’s “primary lodging” if you want one per trip).

---

## 2. Trip = lean; Destination = the bolt-on (multi-city)

**Trip** today has: tripName, purpose, categories, **city, state, country** (one place), startDate, endDate, daysTotal, dateRange, season, plus all the modules. That’s a lot and assumes **one** destination.

**Proposal:**

- **Trip** = lean container: name, purpose, date range (start/end), status (PLANNED/CONFIRMED), suggestedStops (string), **and** a link to **one or more Destinations** (so multi-city is natural).
- **Destination** = first-class bolt-on:
  - **name** (e.g. “Virginia Beach”, “NYC leg”)
  - **city** (actual city)
  - **state** (optional)
  - **country** (optional)
  - Optional: time range (arrive/leave) if you want per-destination dates.
  - Trip ↔ Destination: one-to-many (trip has many destinations; order or “first stop” by position or date).

So “where we’re going” is **Destination(s)**; Trip just holds the overall dates and status and points at destinations. Less on Trip; multi-city is “add another Destination.”

---

## 3. Day: no separate entity for MVP1 — enum or date on ItineraryItem

Right now “day” is implied by **itineraryDay** (DateTime) on Dining/Attraction. That forces a full date and ties the item to a calendar day. For MVP1 you want **less** weight on “day” and **more** on **ItineraryItem** as the thing.

**Options:**

- **A) Day = date on the item**  
  ItineraryItem has **date** (optional). So “when” is just a date field; no Day entity. List items by date in the UI. Simple; works like **city_runs** in GoFast (the run has a **date** on it; no separate “Day” table).

- **B) Day = enum on the item**  
  ItineraryItem has **day** (optional): e.g. `DAY_1 | DAY_2 | DAY_3 | …` or “Day 1”, “Day 2” as strings. Trip has a date range; “Day 1” = first day, “Day 2” = second, etc. No Day table; just an enum or string that the UI maps to the trip’s date range.

- **C) Day = string array on Trip**  
  Trip has **dayLabels** (string[]) e.g. `["Nov 26", "Nov 27", "Nov 28"]`. ItineraryItem has **dayIndex** (optional, 0-based). So “this item is on day 2” = dayIndex 1. No Day entity; just an index into the trip’s labels.

**Recommendation for MVP1:** **ItineraryItem** has either:
- **date** (optional DateTime) — “when” is a calendar date; no Day table; like city_runs; or  
- **day** (optional enum or string): e.g. `DAY_1 .. DAY_N` or “Day 1” so we don’t need a full date until we lock in.  

Avoid a **Day** entity with its own junction for MVP1. Keep “day” as a **field** on the item (date or enum). If you later need “Day” as its own thing (e.g. day-level notes, order), you can add it; for now the thing is **ItineraryItem** and day is just how we group or order it.

---

## 4. ItineraryItem: the one thing; optional artifact + day

**ItineraryItem** (per trip):

- **tripId** (required)
- **status** (CONSIDERING | CONFIRMED | DROPPED)
- **title**
- **dateText** (optional), **date** (optional), or **day** (optional enum/string) — “when” for MVP1
- **destinationId** (optional) — if trip has multiple destinations, which one this item is for
- **lodgingId** (optional) — reference to Lodging artifact
- **diningId** (optional) — reference to Dining artifact  
- **attractionId** (optional) — reference to Attraction artifact  
  (So the item can “wrap” a reusable place; if you don’t need artifact yet, title + notes is enough.)
- **location** / **venue** / **notes** (optional)
- **type** (optional): event | dining | attraction | lodging | city | other
- **suggestedById** (optional)

So: **ItineraryItem** = the thing. Day = date or enum on it. Artifacts (Lodging, Dining, Attraction) are reusable and **referenced** by the item, not owned by the trip.

---

## 5. Summary table

| Concept | Current | Proposal |
|--------|---------|----------|
| **Lodging** | One per trip (tripId) | **Artifact** (reusable); no tripId; referenced by ItineraryItem (or trip’s “primary lodging” if needed). |
| **Dining** | Many per trip (tripId) | **Artifact** (reusable); referenced by ItineraryItem. |
| **Attraction** | Many per trip (tripId) | **Artifact** (reusable); referenced by ItineraryItem. |
| **Trip** | Heavy (city, state, country, + all modules) | **Lean**: name, purpose, date range, status, suggestedStops; **destinations** (one or many). |
| **Destination** | Implicit (city/state/country on Trip) | **First-class**: name, city, state?, country?; trip has many; multi-city = many destinations. |
| **Day** | itineraryDay (DateTime) on Dining/Attraction | **No Day entity.** On **ItineraryItem**: **date** (optional) or **day** (optional enum/string). MVP1: item is the thing; day is a field. |
| **ItineraryItem** | Doesn’t exist (Dining/Attraction are the items) | **The** thing: tripId, status, title, date/day, optional refs to Lodging/Dining/Attraction artifacts, destinationId, type, notes. |

---

## 6. GoFast city_runs analogy

In GoFast, **city_runs** are first-class: they have a **date**, title, location, runCrewId, etc. RSVPs and messages attach to the **run**. There is no separate “Day” table — the run has a date. So for TripWell: **ItineraryItem** is like the “run”; **day** is just a **date** or **day enum** on the item. No need for an independent Day entity with its own junction for MVP1; keep it as a simple field on the thing (the item).

---

## 7. MVP1 takeaway

- **Artifacts:** Lodging, Dining, Attraction = reusable; no tripId; ItineraryItem (or trip) references them.
- **Trip:** Lean; **Destination(s)** = the bolt-on for “where” (and multi-city).
- **Day:** No Day entity; **ItineraryItem** has optional **date** or **day** (enum/string). The thing is the item; day is just how we order or group it.
