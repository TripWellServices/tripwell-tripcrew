# Crew Patterns & Itinerary Item Design

**Goal:** Align on what a crew can do, how itinerary items flow (suggest → comment → vote → lock in), and where things live in the schema so vote isn’t a one-off—it fits a single mental model.

**Big picture:** There are two layers. **(1) Whiteboard (pre-trip)** — crew-level “we might go somewhere”: suggest cities/ideas, vote, then lock in or “Create trip from this.” **(2) Trip** — once you have a trip, itinerary items (dining, attractions) with suggest/comment/vote/lock-in. See **`docs/WHITEBOARD_PRE_TRIP.md`** for the whiteboard design.

---

## 1. What you can do in a crew (patterns)

| Capability | What it is | Current state | Schema / notes |
|------------|------------|---------------|----------------|
| **Itinerary management** | Plan what happens which day: dining, attractions, activities | Trip has Dining[], Attraction[] with optional `itineraryDay`. ItineraryCard assigns to days. | No “suggestion” lifecycle; items are either there or not. |
| **Hotel / lodging** | One lodging per trip (address, place details) | Lodging model, 1:1 with Trip. | Could later support “suggestions” (e.g. multiple options, then lock one). |
| **Messaging** | Crew chat / comments | Not implemented. | Would be TripCrew-level or Trip-level; comments could be “on” an itinerary item. |
| **Itinerary item suggestion** | Propose an item → discuss → optionally vote → lock in | Not implemented. Voting was added ad hoc (ItineraryVote on dining/attraction ids). | Need a first-class “suggestion” or “itinerary item” with status + comments. |

So the big picture is: **itinerary item** = something that can be suggested, commented on, voted on (optional), and then **locked in** as the final choice for a day (or dropped).

---

## 2. UX flow (suggestion → comment → vote → lock in)

1. **Suggest** – A crew member adds an item: “Dinner at X” or “Museum Y on Tuesday.”
2. **Comment** – Others reply on that item (questions, “we did this last time,” etc.).
3. **Vote (optional)** – Crew votes yes/no (or thumbs up/down) to signal interest. Not required to lock in.
4. **Lock in** – Someone (e.g. admin) marks the item as **locked in**: it’s on the itinerary for that day (or “confirmed” even without a day). Locked-in items are the source of truth for “what we’re doing.”

So we need:

- A **status** (or stage) for each itinerary item: e.g. `SUGGESTION` | `LOCKED_IN` (and maybe `REJECTED` / `DROPPED` later).
- **Comments** attached to that item (not just free-form messaging).
- **Votes** per traveler on that item (yes/no) — so vote is **not** “a string on the item”; it’s one-per-traveler, so it stays a relation (e.g. `ItineraryVote` pointing at the item).
- **Lock in** = set status to `LOCKED_IN` (and optionally set `itineraryDay` when locking).

---

## 3. Schema: where does “vote” live?

- **Vote cannot be a single field on the item** because multiple travelers each have a vote. So we need either:
  - A **relation table** (e.g. `ItineraryVote`: `itemId` + `travelerId` + `vote`), or
  - An **aggregate** on the item (e.g. `yesCount`, `noCount`) that we update when someone votes — but then we lose “who voted what” and can’t change a vote cleanly. So the relation table is the right pattern.
- So: **vote stays as a relation** (one row per traveler per item). The only design choice is: what is “the item”? Either:
  - **A)** A unified **ItineraryItem** (suggestion) that can hold or reference dining/attraction/lodging details, or
  - **B)** Keep Dining / Attraction as the items and keep ItineraryVote pointing at them (current approach). Then we’d add “suggestion” and “comments” elsewhere (e.g. a wrapper or a separate Suggestion model that references diningId/attractionId).

Option **A** gives one clear “thing” that has status, comments, votes, and lock-in. Option **B** keeps existing Dining/Attraction and adds suggestion + comment layers on top. Below we sketch both and recommend one.

---

## 4. Option A: First-class ItineraryItem (unified suggestion)

**Idea:** One model that represents “a thing on the itinerary” (suggestion or locked-in). It has a **type** (dining, attraction, lodging, activity, etc.), optional **place details** (or FKs to existing Dining/Attraction when we want to reuse Google data), **status**, and relations for comments and votes.

```prisma
enum ItineraryItemStatus {
  SUGGESTION   // Proposed, not yet decided
  LOCKED_IN    // Confirmed for the trip (and optionally assigned to a day)
  DROPPED      // Optional: rejected or removed from consideration
}

enum ItineraryItemType {
  DINING
  ATTRACTION
  LODGING
  ACTIVITY     // Generic "thing to do"
}

model ItineraryItem {
  id            String              @id @default(uuid())
  tripId        String
  type          ItineraryItemType
  status        ItineraryItemStatus @default(SUGGESTION)
  title         String
  suggestedById String             // Traveler who suggested
  itineraryDay  DateTime?           // Set when locking in (or when suggesting a day)
  // Optional: link to rich place data once we have it
  diningId      String?             // If type=DINING and we created a Dining record
  attractionId  String?             // If type=ATTRACTION and we created an Attraction
  lodgingId     String?            // If type=LODGING
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  trip       Trip              @relation(...)
  suggestedBy Traveler          @relation(...)
  comments   ItineraryItemComment[]
  votes      ItineraryVote[]    // FK to this item instead of (itemType + itemId)
  // optional: dining, attraction, lodging relations when set
}
```

- **Comments:** `ItineraryItemComment(itineraryItemId, travelerId, body)`.
- **Votes:** `ItineraryVote(itineraryItemId, travelerId, vote)` — same pattern as now but with a single `itineraryItemId` FK (no polymorphic itemType/itemId).
- **Lock in:** Set `status = LOCKED_IN` and optionally set `itineraryDay`. Optionally create/attach a Dining or Attraction record for maps/details.

**Pros:** One concept (ItineraryItem); status, comments, votes, and lock-in all on the same entity; easy to add ACTIVITY or other types.  
**Cons:** Migration from current Dining/Attraction: we’d either migrate existing rows into ItineraryItems or run both models (Dining/Attraction for “locked” place data, ItineraryItem for the lifecycle).

---

## 5. Option B: Keep Dining / Attraction; add “suggestion” and comments on top

**Idea:** Dining and Attraction stay as they are (the “locked” or confirmed places). We add:

- **ItinerarySuggestion** – tripId, type (dining | attraction), title, suggestedById, status (SUGGESTION | LOCKED_IN | DROPPED), **diningId?**, **attractionId?** (set when we lock in and create/link the Dining or Attraction), itineraryDay?, createdAt.
- **ItinerarySuggestionComment** – suggestionId, travelerId, body.
- **ItineraryVote** – keep current shape but point at **suggestionId** instead of (itemType + itemId). So we vote on “suggestions,” not on the final Dining/Attraction record.

Flow: Suggest (create ItinerarySuggestion) → comment → vote → lock in (create or link Dining/Attraction, set suggestion.status = LOCKED_IN).

**Pros:** Minimal change to existing Dining/Attraction and existing UI that reads them.  
**Cons:** Two concepts (suggestion vs final place); votes and comments live on the suggestion, and the “real” itinerary is still Dining[]/Attraction[].

---

## 6. Recommendation and “vote as string on model?”

- **Vote:** Keep as a **relation** (not a string on the item). One row per (item, traveler) with `vote = 'yes' | 'no'`. That way we can change votes and show “who voted what” if we want.
- **Schema direction:** Prefer **Option A (ItineraryItem)** if you’re okay with a migration path (existing Dining/Attraction become “locked” ItineraryItems or we keep both and only use ItineraryItem for new flow). Prefer **Option B (ItinerarySuggestion)** if you want the smallest change and to keep current Dining/Attraction as the source of truth for “what’s on the trip.”
- **Hotel reservations:** Can stay as Lodging (one per trip) for now; later you could add “LodgingSuggestion” or use ItineraryItem with type LODGING and optional lodgingId.
- **Messaging:** Separate: TripCrew or Trip-level channel(s). Comments on itinerary items are a separate relation (per-item discussion), not the only messaging.

---

## 7. Summary table (target state)

| Concept | Where it lives | Note |
|---------|----------------|------|
| Crew container | TripCrew | Already in place (RunCrew-style). |
| Trips | Trip | Belongs to TripCrew. |
| “An item on the itinerary” (suggestion + lock-in) | ItineraryItem (A) or ItinerarySuggestion (B) | Has status enum: SUGGESTION \| LOCKED_IN \| (DROPPED). |
| Comments on that item | ItineraryItemComment / ItinerarySuggestionComment | FK to the item/suggestion. |
| Vote (yes/no per traveler) | ItineraryVote | Relation: itemId (or suggestionId) + travelerId + vote. Not a string on the item. |
| Lock in | Update status to LOCKED_IN (+ optional itineraryDay) | Optionally create/link Dining or Attraction when locking. |
| Hotel | Lodging | Stays 1:1 with Trip; could later be driven by ItineraryItem type LODGING. |
| Messaging | TBD (Trip or TripCrew) | Separate from “comment on itinerary item.” |

Next step could be: choose A vs B, then add the chosen model(s) and enums, then migrate ItineraryVote to point at the new item/suggestion ID so the schema matches this big picture.
