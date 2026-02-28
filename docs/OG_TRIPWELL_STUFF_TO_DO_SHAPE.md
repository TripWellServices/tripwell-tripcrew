# OG TripWell: How “attractions” / stuff-to-do was built (the shape)

**Source:** tripwell-gofastbackend (Mongo). The missing piece for itinerary is **bolting on “stuff to do”** keyed by **city/destination + season**, not by trip. **CityStuffToDo** was the **catalogue** (curated attractions / restaurants / neat things); MetaAttractions was the lighter, AI-generated meta layer. Trip (or user) **selects** from that layer; itinerary references it.

---

## 1. The bolt-on: keyed by city + season (not trip)

**MetaAttractions** — city-scoped “meta” suggestions (AI-generated):

```js
// Key: cityId (ref City) + season
{
  cityId: ObjectId,   // ref City
  cityName: String,  // denormalized for queries
  season: String,
  metaAttractions: [
    { name: String, type: String, reason: String }
  ],
  status: String
}
```

So: **one row per city+season**; content is a list of `{ name, type, reason }`. No tripId. Reusable across trips to that city.

**CityStuffToDo** (schema in PersonaCityIdeas.js) — **the catalogue**: city + season + persona-shaped “samples” (curated stuff to do):

```js
// Key: cityId + season
{
  cityId: String,
  season: String,  // spring | summer | fall | winter | any
  samples: {
    attractions:  [{ id, name, description }],
    restaurants:  [{ id, name, description }],
    neatThings:   [{ id, name, description }]
  },
  metadata: { persona_weights: { art, foodie, adventure, history }, budget_level, ... },
  prompt: String  // debug
}
```

So: **three buckets** — attractions, restaurants, neatThings — each item `{ id, name, description }`. Still keyed by **cityId + season**; no trip. This is the “stuff to do” catalogue for a destination.

---

## 2. How the trip uses it: select, don’t own

**UserSelections** — per trip + user, **selections from** the bolt-on:

```js
{
  tripId: ObjectId,
  userId: String,
  selectedMetas: [{ name, type, reason, selectedAt }],   // from MetaAttractions
  selectedSamples: [{ name, type, why_recommended, selectedAt }],  // from CityStuffToDo
  behaviorData: { totalSelections, metaPreferences, samplePreferences, ... }
}
```

So the trip doesn’t **store** attraction rows. It stores **“user picked these from the city’s stuff”**. The “stuff” lives in MetaAttractions / CityStuffToDo; the trip has references/selections.

**ItineraryDays** — parsed itinerary (tripId + userId):

- `rawItineraryText` (AI output)
- `parsedDays[]`: each day has blocks (morning/afternoon/evening), each block has `activity` (string), `type` (attraction | restaurant | activity | transport | free_time), `persona`, `budget`. So the **itinerary** is “on day 2 morning we do X (attraction)”; the actual X can come from the city’s stuff or be free text.

---

## 3. The shape (for tripwell-tripcrew)

| Layer | Key | Content | Role |
|-------|-----|--------|------|
| **City** | cityName (unique) | — | Library anchor (parseCity get-or-create). |
| **MetaAttractions** | cityId + season | metaAttractions[] { name, type, reason } | “Stuff to do” for this city+season (AI-generated). |
| **CityStuffToDo** | cityId + season | samples { attractions[], restaurants[], neatThings[] } | **The catalogue** — curated stuff (persona-aware); each item { id, name, description }. |
| **UserSelections** | tripId + userId | selectedMetas[], selectedSamples[] | Trip **selects** from the bolt-on; doesn’t own the rows. |
| **ItineraryDays** | tripId + userId | parsedDays[] (blocks with activity, type) | Itinerary **references** activity/type; data comes from city layer + selections. |

So **attractions** in the OG weren’t “Attraction rows on Trip.” They were:

1. **Stuff to do** (MetaAttractions / CityStuffToDo) keyed by **city + season** — the bolt-on.
2. **User/trip** selects from that (UserSelections).
3. **Itinerary** is blocks (day + slot + activity + type) that reference that stuff or free text.

For tripwell-tripcrew: if we add **Destination** (city-level) and want “stuff to do” without duplicating per trip, the shape is: **StuffToDo** (or equivalent) keyed by **destination/city + season**, with content like **attractions[], restaurants[], neatThings[]** (or a single list with type). **ItineraryItem** then **references** or **selects** from that (e.g. stuffToDoItemId or a copy of name/type), instead of owning its own Attraction table. That’s the bolt-on shape.

---

## 4. Catalogue = independent, bolt-on vs string

**“Catalogue”** here means: the **stuff to do** entries are **first-class models** (independent). Itinerary can **bolt on** to them instead of being only free text.

- **String only:** ItineraryItem with `title = "go to beach"` — fine for ad-hoc items, but no structured record.
- **Bolt-on:** ItineraryItem with `title = "Visit Venice Beach"` and **`stuffToDoId`** → points at a **StuffToDo** (catalogue) record. So “Venice Beach” is a real row (name, description, type, city, etc.); the itinerary item **references** it. Same pattern as GoFast: the race is a first-class object, not the string “Boston Marathon.”

So: **catalogue** = independent StuffToDo (or StuffToDoItem) model; **ItineraryItem** can optionally reference one (`stuffToDoId`). You get “Visit Venice Beach (StuffToDo)” instead of just the string “go to beach.” The catalogue stays independent; itinerary bolts on when you want the link.
