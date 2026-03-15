# Current Architecture (As-Is)

**What’s actually in the schema and app today.** No proposals — just inventory.

**Tenant:** TripWellEnterprise is the company/tenant container; Traveler has `tripWellEnterpriseId`. All things should tie back to that. For GoFast alignment (role on member, JoinCode deprecated, invite by handle), see **`docs/GOFAST_MVP_ANALYSIS_AND_ALIGNMENT.md`**.

---

## 1. Crew / Trip alignment with GoFast

- **TripCrew = first-class container** (like GoFast’s run_crews). It owns members (TripCrewMember), roles (TripCrewRole), and Trips. When messaging is added, it should be **crew-scoped** (e.g. TripCrewMessage.tripCrewId), not trip-scoped, so the crew has one chat across all trips — same as GoFast’s run_crew_messages.
- **Trip = the “run”** (like GoFast’s run_crew_events). It is one planned occurrence: dates, destination(s), and itinerary. TripCrew has many Trips; each Trip is “the thing we’re doing together” for that occurrence.

So: **Crew** is the container for members and (when added) messaging; **Trip** is the occurrence.

---

## 2. Hierarchy

```
TripWellEnterprise (tenant)
  └── Traveler[] (people; Firebase auth)

TripCrew (the “crew” / container)
  └── TripCrewMember[] (who’s in the crew)
  └── TripCrewRole[] (admin / manager)
  └── Trip[] (trips = occurrences, like “runs”)
  └── JoinCode[] (invite codes for this crew)

Trip (one occurrence: when + where + what)
  └── Destination[] (where — links to City; multi-city supported)
  └── ItineraryItem[] (what we’re doing; bolts to first-class entities)
  └── Lodging? (legacy one per trip; also referenceable via ItineraryItem)
  └── Dining[], Attraction[] (legacy; also referenceable via ItineraryItem)
  └── LogisticItem[] (checklist)
  └── PackItem[] (packing list)

First-class “bolt-on” entities (linked from ItineraryItem and/or City)
  └── City (first-class; Trip → Destination → City)
  └── Concert (artist, venue, city, date; ItineraryItem.concertId)
  └── Hike (trail/place, city, difficulty, distance; ItineraryItem.hikeId)
  └── Lodging, Dining, Attraction (ItineraryItem has lodgingId, diningId, attractionId)
  └── StuffToDoItem (catalogue by city + season; ItineraryItem.stuffToDoId)
```

So: **TripCrew → Trip → Destination / ItineraryItem / logistics / pack.** “What we’re doing” lives in **ItineraryItem**, which optionally references first-class entities (Concert, Hike, Lodging, Dining, Attraction, StuffToDo). Trip is the **minimal occurrence** container; content is bolted on via ItineraryItem.

---

## 3. Location

**Trip** can have multiple destinations via **Destination** (tripId, cityId, order). Each Destination links to a first-class **City** (name, state, country). Legacy: Trip also has optional city/state/country strings for backward compatibility. So “location” = one or more Cities via Destination[] (preferred), or the legacy single city/state/country on Trip.

---

## 4. Trip: what it has (lightweight “occurrence”)

| Field / relation | What it is |
|------------------|------------|
| crewId | Which crew owns this occurrence. |
| tripName, purpose, categories | Name, why, tags. |
| status | TripStatus: PLANNED (brainstorm/board) or CONFIRMED (building itinerary). |
| suggestedStops | Scratchpad (e.g. “DC, NYC, summer concerts”). |
| startDate, endDate | Trip dates. |
| daysTotal, dateRange, season | Computed (set by service on create/update). |
| destinations | Destination[] (trip → City); multi-city. |
| itineraryItems | ItineraryItem[] (the main “what we’re doing”; each can reference Concert, Hike, Lodging, Dining, Attraction, StuffToDo). |
| lodging | One Lodging (legacy; optional for day trips). |
| dining, attractions | Legacy direct relations; also referenceable via ItineraryItem. |
| logistics, packItems | Checklist and packing list (optional for day trips). |

**Day trip:** Same Trip model. Use startDate and endDate on the same day; no (or optional) lodging; itinerary items for concerts, hikes, dining, etc. via ItineraryItem. No schema change; a computed or UI “day trip” flag can use e.g. daysTotal === 1 or same calendar day.

**Upcoming vs past (UI):** Trips are split by endDate vs today. Upcoming = endDate >= today; Past = endDate < today (client-side, e.g. categorizedTrips).

---

## 5. Itinerary: ItineraryItem as bolt-on

**ItineraryItem** is the single “slot” on a trip. Each item has:

- tripId, status (CONSIDERING / CONFIRMED / DROPPED), title, date/day, destinationId (optional), notes, suggestedById.
- Optional refs to first-class entities: **lodgingId**, **diningId**, **attractionId**, **stuffToDoId**, **concertId**, **hikeId**.
- **type** (ItineraryItemType): event, concert, dining, attraction, lodging, city, **hike**, other.

So “itinerary” = the list of ItineraryItems for a trip; each item can be a free-form title or can bolt to a Concert, Hike, Lodging, Dining, Attraction, or StuffToDoItem. First-class objects (Concert, Hike, etc.) are the catalogue; ItineraryItem attaches them to a trip and a day.

---

## 6. First-class objects (today)

- **City** — first-class; Trip links via Destination.
- **Concert** — first-class (name, artist, venue, cityId, eventDate); bolts to ItineraryItem via concertId.
- **Hike** — first-class (name, trailOrPlace, cityId, difficulty, distanceMi, durationMin, url, notes); bolts to ItineraryItem via hikeId; ItineraryItemType includes `hike`.
- **Lodging, Dining, Attraction** — first-class; can be linked from ItineraryItem (and legacy tripId).
- **StuffToDoItem** — catalogue by city + season; ItineraryItem.stuffToDoId. **type** is StuffToDoType: **POI** (point of interest), RESTAURANT, NEAT_THING. (POI avoids name collision with the Attraction model.) For why it exists and where it bolts (City, ItineraryItem, API), see **`docs/STUFFTODO_ORIGIN_AND_BOLTS.md`** — no deprecation; understand first, then decide.

---

## 6b. Naming and collisions (Attraction vs StuffToDoItem)

We have two ways to bolt “something to do” onto an itinerary:

1. **Attraction** (model) — full artifact (title, address, googlePlaceId, etc.); trip or enterprise scoped. ItineraryItem.**attractionId** → Attraction.
2. **StuffToDoItem** (model) — lightweight **city + season** catalogue (name, description, type). ItineraryItem.**stuffToDoId** → StuffToDoItem. StuffToDoItem.**type** is **POI** | RESTAURANT | NEAT_THING.

Collision: “Attraction” was used for (a) the Attraction table and (b) the enum value StuffToDoType.ATTRACTION. That’s resolved by renaming the enum value to **POI** (point of interest). Conceptually, POI and Attraction are similar (things to see/do); Attraction = full artifact row, StuffToDoItem with type POI = lightweight catalogue row. RESTAURANT overlaps with Dining; NEAT_THING is catch‑all. When building an itinerary you can either link to an **Attraction** row (attractionId) or to a **StuffToDoItem** row (stuffToDoId) — two different first-class shapes, both bolt onto ItineraryItem.

---

## 7. What doesn’t exist (current schema)

- No **TripCrewMessage** (or equivalent). When added, scope by **tripCrewId** so crew is the messaging container.
- No comments on items (no comment table for dining/attraction).
- No voting on items (no ItineraryVote or equivalent).

---

## 8. Schema change list (recent and future)

- **Done:** First-class **Hike** model; **ItineraryItem.hikeId** and ItineraryItemType **hike**. Migration: `20250314120000_add_hike_and_itinerary_hike`.
- **Done:** **StuffToDoType.ATTRACTION** renamed to **POI** to avoid collision with Attraction model name. Migration: `20250314130000_rename_stufftodotype_attraction_to_poi`.
- **Future:** **TripCrewMessage** (tripCrewId, authorId, content, topic?, createdAt, updatedAt) so crew is the first-class container for messaging.

---

## 9. One-line summary

**Current:** TripCrew is the container (members, roles, trips; messaging to be crew-scoped). Trip is the “run” — one occurrence (dates, Destination(s), ItineraryItem[], logistics, pack). ItineraryItem is the bolt-on surface: each slot can reference first-class Concert, Hike, Lodging, Dining, Attraction, or StuffToDo. Day trip = Trip with same-day dates and no lodging. First-class objects include City, Concert, Hike, Lodging, Dining, Attraction, StuffToDoItem.
