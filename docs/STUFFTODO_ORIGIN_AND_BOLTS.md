# StuffToDoItem: why it exists, where it bolts, and deprecation

This doc captures **origin**, **bolt-on points**, and the decision to **deprecate** in favor of first-class objects. Schema and APIs remain for backward compatibility; new work should use Attraction, Dining, Concert, Hike, Lodging and AI categorization by type.

---

## Why it exists (OG TripWell)

In the original design (see **`docs/OG_TRIPWELL_STUFF_TO_DO_SHAPE.md`**), "stuff to do" was a **city + season catalogue** — keyed by **destination/city**, not by trip.

- **CityStuffToDo** had three buckets: attractions, restaurants, neat things. Each item was `{ id, name, description }`.
- The trip **selected** from that catalogue instead of owning its own Attraction rows.
- So: "what's in this city (for this season)" was the catalogue; the itinerary **referenced** it.

In tripwell-tripcrew, **StuffToDoItem** is the same idea:

- **Lightweight, city-scoped catalogue**: `cityId`, `season`, `type` (POI | RESTAURANT | NEAT_THING), `name`, `description`.
- Lets you **quick add** from "what's in this city" without creating a full Attraction/Dining artifact first.
- The **type** was the quick way to bucket entries (POI, RESTAURANT, NEAT_THING) before we had the full first-class set (Attraction, Dining, Concert, Hike, etc.).

---

## Where it bolts

| From | To | How |
|------|-----|-----|
| **City** | StuffToDoItem[] | Each StuffToDoItem has `cityId`; City has relation `stuffToDoItems`. **GET `/api/cities/[cityId]`** includes `stuffToDoItems` (ordered by season, name). |
| **ItineraryItem** | StuffToDoItem? | ItineraryItem has optional **`stuffToDoId`**; when set, that slot references the catalogue row. **POST/PATCH** itinerary-items accept `stuffToDoId`; responses include `stuffToDo`. |
| **API** | StuffToDoItem CRUD | **GET/POST** `/api/stuff-to-do` (list by cityId, optional season/type; create). **GET/PATCH/DELETE** `/api/stuff-to-do/[id]**. |

Flow in one line: **City → StuffToDoItem[]** (catalogue for that city + season); **ItineraryItem.stuffToDoId → StuffToDoItem** (this slot is "that catalogue entry").

---

## Relation to first-class objects

- **Attraction, Dining, Concert, Hike, Lodging** = full first-class entities (rich fields, trip or enterprise scoped); ItineraryItem can reference them via `attractionId`, `diningId`, `concertId`, `hikeId`, `lodgingId`.
- **StuffToDoItem** = lightweight catalogue row (city + season, name, description, type). ItineraryItem references it via **`stuffToDoId`**.

So we have two ways to put "something to do" on an itinerary: link to a **first-class** row (Attraction, Dining, etc.) or link to a **StuffToDoItem** catalogue row.

---

## Current app: no ingest UI, no select-by-city UI

In the app today:

- **Ingest:** No UI creates StuffToDoItems. Only **POST `/api/stuff-to-do`** can create them (e.g. seed scripts or manual API calls). There is no in-app "add POI" or "add stuff to do for this city" flow.
- **Select by city:** No screen uses **GET `/api/cities/[cityId]`** (which includes `stuffToDoItems`) or **GET `/api/stuff-to-do?cityId=...`**. The plan wizard only creates/gets a city and adds it as a destination; it does not load or show "stuff to do" for a city.

So the replacement work is about **building** the right flows (ingest into first-class objects + optional AI; select-by-city using first-class objects + optional AI), not removing existing UI. Do not change schema or APIs for StuffToDoItem until those flows are scoped or in place.

---

## Deprecation: prefer first-class objects; POI lives on via AI

**Decision:** StuffToDoItem is **deprecated**. Prefer first-class objects (Attraction, Dining, Concert, Hike, Lodging) and bolt those to ItineraryItem. Do not add new features or flows that rely on StuffToDoItem.

**POI / type concept:** The idea of "point of interest" or "categorize by type" is still useful — we just don't need a separate table for it. Instead, **teach the AI to parse and categorize by type**: free text or user input (e.g. "Venice Beach," "Joe's Pizza," "Griffith Peak") gets parsed and classified into the right first-class type (Attraction, Dining, Hike, Concert, etc.), and we create or link to that entity. So "POI" becomes a *concept* the AI uses when deciding whether something is an Attraction, Dining, Hike, or other first-class type — not a StuffToDoItem row.

Schema and `/api/stuff-to-do` stay for now so existing data and clients keep working; migration path (e.g. move existing StuffToDoItem rows into Attraction/Dining or drop the model) can follow later.
