# Architecture Proposal: Trip First, Universal ItineraryItem

**Principle:** Use the **model** (domain concepts) to do the work. Minimize schema. **Board** and **itinerary votes** are **UX** over the same data, not new entities.

---

## 1. Hierarchy

```
TripCrew
  └── Trip (one or many)
        └── ItineraryItem (many)
```

- **Trip** is the container. It has a **status** that tells you what mode you’re in.
- **ItineraryItem** is the one universal “thing”: a suggested concert, a dinner, a city, a stop. Everything (votes, comments, “considering vs confirmed”) hangs off **ItineraryItem**. No BoardCard, no separate WhiteboardItem.

---

## 2. Trip: status + suggestedStops (model doing the work)

**Trip** has:

- **status** (enum): `PLANNED` | `CONFIRMED`
  - **PLANNED** = we’re still figuring it out (brainstorm / “plan a trip” mode). No locked dates/destination required yet.
  - **CONFIRMED** = we’re building a real trip (dates, destination, day-by-day itinerary). “Build a planned trip” mode.
- **suggestedStops** (string, optional): free-text scratchpad for “we’re thinking DC, NYC, summer concerts” before or alongside structured ItineraryItems. The **model** (this field) does the work; no extra table.

So:

- **“Plan a trip”** → create or open a Trip with `status = PLANNED`. UX can show a board (Considering | Confirmed) over that trip’s ItineraryItems.
- **“Build a planned trip”** → create or open a Trip with `status = CONFIRMED` (or move an existing PLANNED trip to CONFIRMED). UX shows the classic itinerary (dates, days, assign items to days).

One Trip type. Status drives the UX.

---

## 3. ItineraryItem: the one universal thing

**ItineraryItem** is the only “item” entity. It can represent:

- A possible concert (Noah Kahan, July 22, DC, Nationals Park) in **planning** mode.
- A dinner or attraction on a **confirmed** trip, optionally assigned to a day.

So the **same table** backs:

- **Board UX** (PLANNED trip): show items in columns by **item status** (Considering | Confirmed | Dropped).
- **Itinerary UX** (CONFIRMED trip): show items by **day** (itineraryDay) and type (dining, attraction, etc.).

**ItineraryItem** needs at least:

- `tripId` (required) — belongs to one Trip.
- **status** (enum): `CONSIDERING` | `CONFIRMED` | `DROPPED` — for board columns and “lock in.”
- **title** (e.g. “Noah Kahan”, “Dinner at X”).
- **dateText** (optional) — “July 22nd”, “July 31–Aug 2”.
- **location** / **venue** (optional).
- **notes** (optional) — freeform.
- **itineraryDay** (optional) — when Trip is CONFIRMED, assign to a date; null = not yet assigned or still considering.
- **type** (optional) — e.g. event | dining | attraction | city, so the UI knows how to render.
- **suggestedById** (optional) — who suggested it.

Votes and comments: **one** relation each, on ItineraryItem only (e.g. `ItineraryItemVote`, `ItineraryItemComment`). No separate BoardCardVote, no itinerary votes on “dining id” vs “attraction id.” **Voting is UX** over ItineraryItem.

---

## 4. Board = UX (no Board table)

- **Board** = a **view** over a Trip’s ItineraryItems when `trip.status === PLANNED`.
- Columns = **item status**: Considering | Confirmed | Dropped.
- “Where do you want to go?” paste → parse into **ItineraryItems** (same table), all with `status = CONSIDERING`, on that Trip.
- Moving a card = **PATCH ItineraryItem** (e.g. `status = CONFIRMED`). No BoardCard schema.

---

## 5. Itinerary votes = UX (one relation on ItineraryItem)

- **Voting** = one relation: `ItineraryItemVote(itemId = ItineraryItem.id, travelerId, vote)`.
- Same for comments: `ItineraryItemComment(itemId, travelerId, body)`.
- No “itinerary votes on dining” vs “on attraction” — only on **ItineraryItem**. If we still have legacy Dining/Attraction tables for rich place data, they can be **optional links** from ItineraryItem when we need maps/ratings, but the canonical “thing the crew votes on” is ItineraryItem.

---

## 6. What we remove / don’t add

- **No BoardCard** (or WhiteboardItem) — that’s the board UX over ItineraryItems.
- **No separate “board cards” table** — same items, different filter/columns by status.
- **No duplicate vote tables** — one ItineraryItemVote tied to ItineraryItem only.
- **Trip.suggestedStops** — one string field instead of a whole “suggestions” table for scratchpad.

---

## 7. Fork: “Build a planned trip” vs “Plan a trip”

- **Build a planned trip** — list Trips with `status = CONFIRMED` (or create one); go to trip view (dates, itinerary by day, add dining/attractions as ItineraryItems).
- **Plan a trip** — create or open a Trip with `status = PLANNED`; show **board UX** over that trip’s ItineraryItems (Considering | Confirmed | Dropped), paste “where do you want to go?”, move items, then “Confirm trip” when ready (set Trip to CONFIRMED and optionally prefill dates/destination from an item).

Same schema. Two entry points, two UIs over the same model.

---

## 8. Summary table

| Concept            | Schema / model                         | UX / behavior                                                                 |
|--------------------|----------------------------------------|-------------------------------------------------------------------------------|
| Trip               | `status: PLANNED \| CONFIRMED`, `suggestedStops?: string` | Mode: brainstorm (board) vs build (itinerary).                                  |
| ItineraryItem      | One table, per Trip; status, title, dateText, location, venue, notes, itineraryDay?, type? | Board columns = filter by status. Itinerary view = filter by day. Votes/comments here. |
| Board              | None                                   | View over ItineraryItems when Trip is PLANNED; columns = item status.         |
| Itinerary votes    | One relation: ItineraryItemVote(itemId, travelerId, vote) | UX: vote on any ItineraryItem.                                                  |
| suggestedStops     | Trip.suggestedStops (string)            | Scratchpad; model does the work.                                              |

Everything ties back to **ItineraryItem**. Trip first, then ItineraryItem. Board and votes are UX over that model, not schema sprawl.
