# API routes and schema (post–proposal implementation)

## Schema summary

- **City** — First-class (like GoFast race). `name`, `state?`, `country?`. Unique `(name, state, country)`.
- **Destination** — Bolts to Trip + City. `tripId`, `cityId` (FK City), `name?`, `state?`, `country?`, `order`.
- **Trip** — Lean: `status` (PLANNED | CONFIRMED), `suggestedStops?`; legacy `city?`, `state?`, `country?`. Has many **destinations**, many **itineraryItems**.
- **ItineraryItem** — One universal item: `tripId`, `status` (CONSIDERING | CONFIRMED | DROPPED), `title`, `date?`, `day?`, `destinationId?`, `lodgingId?`, `diningId?`, `attractionId?`, **`stuffToDoId?`** (catalogue bolt-on), `type?`, `notes?`, `suggestedById?`.
- **StuffToDoItem** — Catalogue (independent). `cityId`, `season`, `type` (ATTRACTION | RESTAURANT | NEAT_THING), `name`, `description?`.
- **Lodging, Dining, Attraction** — Artifacts (reusable). `tripId?` (legacy), `tripWellEnterpriseId?`; no required trip. ItineraryItem can reference via `lodgingId`, `diningId`, `attractionId`.

## API routes

### Cities (first-class)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cities` | List cities. Query: `name`, `country`. |
| POST | `/api/cities` | Create or get city. Body: `name`, `state?`, `country?`. Upserts on `(name, state, country)`. |
| GET | `/api/cities/[cityId]` | Get city with `stuffToDoItems`. |

### Trip destinations (Destination bolts to City)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trip/[tripId]/destinations` | List destinations (with `city`). |
| POST | `/api/trip/[tripId]/destinations` | Create destination. Body: `cityId`, `name?`, `state?`, `country?`, `order?`. |
| GET | `/api/trip/[tripId]/destinations/[destinationId]` | Get one destination. |
| PATCH | `/api/trip/[tripId]/destinations/[destinationId]` | Update destination. |
| DELETE | `/api/trip/[tripId]/destinations/[destinationId]` | Delete destination. |

### Itinerary items
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trip/[tripId]/itinerary-items` | List items (with destination, lodging, dining, attraction, stuffToDo, suggestedBy). |
| POST | `/api/trip/[tripId]/itinerary-items` | Create item. Body: `title`, `status?`, `dateText?`, `date?`, `day?`, `destinationId?`, `lodgingId?`, `diningId?`, `attractionId?`, **`stuffToDoId?`**, `type?`, `location?`, `venue?`, `notes?`, `suggestedById?`. |
| PATCH | `/api/trip/[tripId]/itinerary-items/[itemId]` | Update item. |
| DELETE | `/api/trip/[tripId]/itinerary-items/[itemId]` | Delete item. |

### Stuff-to-do (catalogue)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stuff-to-do?cityId=&season=&type=` | List by city (required), optional season and type (ATTRACTION \| RESTAURANT \| NEAT_THING). |
| POST | `/api/stuff-to-do` | Create. Body: `cityId`, `name`, `season?`, `type`, `description?`. |
| GET | `/api/stuff-to-do/[id]` | Get one. |
| PATCH | `/api/stuff-to-do/[id]` | Update. |
| DELETE | `/api/stuff-to-do/[id]` | Delete. |

### Artifacts (reusable lodging, dining, attractions)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lodging?tripId=&tripWellEnterpriseId=` | List (optional filters). |
| POST | `/api/lodging` | Create. Body: `tripId?`, `tripWellEnterpriseId?`, `title`, … |
| GET | `/api/lodging/[id]` | Get one. |
| PATCH | `/api/lodging/[id]` | Update. |
| DELETE | `/api/lodging/[id]` | Delete. |
| GET | `/api/dining?tripId=&tripWellEnterpriseId=` | List. |
| POST | `/api/dining` | Create. |
| GET | `/api/dining/[id]` | Get one. |
| PATCH | `/api/dining/[id]` | Update. |
| DELETE | `/api/dining/[id]` | Delete. |
| GET | `/api/attractions?tripId=&tripWellEnterpriseId=` | List. |
| POST | `/api/attractions` | Create. |
| GET | `/api/attractions/[id]` | Get one. |
| PATCH | `/api/attractions/[id]` | Update. |
| DELETE | `/api/attractions/[id]` | Delete. |

### Trip
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trip/[tripId]` | Get trip with **destinations** (with city), **itineraryItems** (with destination, lodging, dining, attraction, stuffToDo, suggestedBy), lodging, dining, attractions, logistics, packItems. |

## Applying the schema

Run either:

- **Development:** `npx prisma db push` — applies schema to your DB (no migration file).
- **Production:** `npx prisma migrate dev --name add_city_destination_itinerary_stufftodo` — creates and applies a migration (run in an interactive shell).

Existing rows: `Trip.city`, `Trip.state`, `Trip.country` become nullable; existing values are preserved. Lodging/Dining/Attraction `tripId` becomes nullable; existing rows keep their `tripId`.
