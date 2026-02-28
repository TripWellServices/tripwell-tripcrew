# Current Architecture (As-Is)

**What’s actually in the schema and app today.** No proposals — just inventory.

**Tenant:** TripWellEnterprise is the company/tenant container; Traveler has `tripWellEnterpriseId`. All things should tie back to that. For GoFast alignment (role on member, JoinCode deprecated, invite by handle), see **`docs/GOFAST_MVP_ANALYSIS_AND_ALIGNMENT.md`**.

---

## 1. Hierarchy

```
TripWellEnterprise (tenant)
  └── Traveler[] (people; Firebase auth)

TripCrew (the “crew” / container)
  └── TripCrewMember[] (who’s in the crew)
  └── TripCrewRole[] (admin / manager)
  └── Trip[] (trips belong to the crew)
  └── JoinCode[] (invite codes for this crew)

Trip (one per planned trip)
  └── Lodging? (one per trip — the hotel)
  └── Dining[] (restaurants; can be assigned to a day)
  └── Attraction[] (things to do; can be assigned to a day)
  └── LogisticItem[] (checklist: “book flight”, etc.)
  └── PackItem[] (packing list)
```

So: **TripCrew → Trip → Lodging / Dining / Attraction / logistics / pack.** There is **no** “ItineraryItem” table; “itinerary” is implemented as Dining + Attraction with an optional `itineraryDay` “itinerary” is just Dining + Attraction with optional itineraryDay.

---

## 2. Location: what is it?

**Trip** has a single destination expressed as:

- **city** (required)
- **state** (optional)
- **country** (required)

So “location” today = **one city/state/country per trip**. There is no multi-city or multi-stop model; one trip = one place (e.g. “Virginia Beach, VA, USA”). Display is typically `city + state + country` (or `city + country` if no state).

---

## 3. Hotel

**Yes.** There is a **Lodging** model:

- One **Lodging** per **Trip** (`tripId` unique).
- Fields: title, address, website, phone, googlePlaceId, imageUrl, rating, lat/lng.
- So “the hotel” = the single Lodging row for that trip. No multiple options or “suggested hotels” — just one.

---

## 4. Trip: what it has

| Field / relation | What it is |
|------------------|------------|
| tripName | Name of the trip (e.g. “Thanksgiving 2025”). |
| purpose | Free-text “why we’re going”. |
| categories | Multi-select enum (FAMILY, BEACH, CITY, etc.). |
| city, state, country | Single destination (see Location above). |
| startDate, endDate | Trip dates. |
| daysTotal, dateRange, season | Computed (set by service on create/update). |
| lodging | One Lodging (hotel). |
| dining | Many Dining (restaurants); each can have `itineraryDay`. |
| attractions | Many Attraction; each can have `itineraryDay`. |
| logistics | Checklist (LogisticItem). |
| packItems | Packing list (PackItem). |

There is **no** Trip status (e.g. PLANNED vs CONFIRMED) and **no** suggestedStops or scratchpad field. Every Trip is “a real trip” with dates and a destination.

---

## 5. “Itinerary” today

- **Itinerary** = which Dining and Attraction are assigned to which **day**.
- Dining and Attraction have **itineraryDay** (DateTime?, optional). The UI (e.g. ItineraryCard) shows trip days and assigns items to a day or “not scheduled”.
- There is **no** single ItineraryItem table. “Itinerary items” are **Dining** and **Attraction** rows with optional `itineraryDay`.

---

## 6. What doesn’t exist (current schema)

- No Trip status (e.g. PLANNED / CONFIRMED).
- No Trip.suggestedStops or similar scratchpad.
- No unified **ItineraryItem** (only Dining + Attraction + optional itineraryDay).
- No board / whiteboard / “considering vs confirmed” columns (no BoardCard or equivalent).
- No comments on items (no comment table for dining/attraction).
- No “suggested by” or “who added this” on Dining/Attraction.
- No voting on items (no ItineraryVote or equivalent).

---

## 7. One-line summary

**Current:** TripCrew has Trips. Each Trip has one location (city/state/country), one Lodging (hotel), many Dining and Attraction (itinerary by day), logistics, and pack list. Location = that one city/state/country. Hotel = Lodging. There is no unified ItineraryItem, no voting on items, and no planning/board mode in the schema.
