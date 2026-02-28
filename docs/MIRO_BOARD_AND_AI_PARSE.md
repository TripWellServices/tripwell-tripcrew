# Miro-Style Board + “Where do you want to go?” AI Parse

**Goal:** Make the crew whiteboard feel like a **Miro board**: a **Considering / Brainstorming** column and a **Confirmed** column. You (or the crew) paste or type ideas — e.g. a list like “summer concerts” with events and details — and we **AI-parse and save** them as cards. You **move cards** from Considering → Confirmed (and optionally Dropped). Same patterns as GoFast: API-driven, clear stages, crew-scoped.

---

## 1. Example: what we’re matching

Your daughter’s list is the persona:

- **Topic:** “Summer concerts”
- **Items** (each = one card):
  - **Noah Kahan** – July 22nd, DC, Nationals Park, “CONFIRMED!!!”
  - **Governors Ball** – June 5th, NYC, Flushing Meadows, lineup + “only first day”
  - **Osheaga** – July 31–Aug 2, Montreal, Parc Jean-Drapeau, lineup + “don’t need first day”
  - **Lollapalooza** – July 31–Aug 2, Chicago, Grant Park, “choose between this and Osheaga”
  - etc.

Each item has: **title** (event name), **date(s)**, **location** (city, venue), **notes** (lineup, transport, preferences). One is explicitly **CONFIRMED**; the rest are “considering.”

So we want:

1. **Board** with **stages** (columns): e.g. **Considering** | **Confirmed** | (optional) **Dropped**.
2. **Cards** that can hold that rich content (title, dates, location, venue, freeform notes).
3. **Paste / “Where do you want to go?”** → AI parses the blob into one or more cards and creates them in **Considering**.
4. **Move** a card from Considering → Confirmed (or Dropped), like Miro/Kanban.

---

## 2. Board = stages (Miro-like)

- **One board per crew** (or per “topic” like “Summer concerts” — see below).  
- **Stages** = columns. Minimal set:
  - **Considering** (brainstorming, not decided)
  - **Confirmed** (we’re doing this; can then “Create trip” from it)
  - **Dropped** (optional; rejected or parked)

Cards live in exactly one stage. “Move” = update the card’s stage (and maybe `position` or `sortOrder` within column).

Same idea as GoFast: **status/stage** is the source of truth; UI is a board view over that.

---

## 3. Cards: rich content + parsed fields

A **card** is one “idea” or “option” (e.g. one concert, one city, one weekend idea). It should support:

- **Title** – e.g. “Noah Kahan”, “Governors Ball”, “Virginia Beach”
- **Date / date range** – e.g. “July 22nd”, “July 31–Aug 2”
- **Location** – city, venue, or “DC”, “Nationals Park”
- **Notes** – freeform (lineup, “take the train”, “very cheap tickets”, “CONFIRMED!!!”)
- **Stage** – considering | confirmed | dropped

So in the schema we need at least:

- `title` (required)
- `stage` (enum: CONSIDERING | CONFIRMED | DROPPED)
- `dateText` or `startDate`/`endDate` (optional, for display and filtering)
- `location` / `venue` (optional)
- `notes` (optional, text)
- `tripCrewId`, `suggestedById`, `position`/`sortOrder`

AI parse: given a paste like the concert list, we send it to an AI (or a small parser) that returns a list of **{ title, date?, location?, venue?, notes? }**; we create one card per item, all in **Considering**, and save via API.

---

## 4. “Where do you want to go?” + AI parse (GoFast-style)

- **Entry point:** A single input or paste area: “Where do you want to go?” (or “Paste your list — we’ll turn it into cards”).
- **Flow:**
  1. User pastes or types a blob (e.g. the full concert list).
  2. Frontend (or backend) calls an **API** that runs **AI parse** (e.g. LLM) to extract structured items: each bullet or block → one card with title, dates, location, notes.
  3. API **creates** that many **BoardCard** (or WhiteboardItem) rows with stage = **Considering** and `suggestedBy` = current user.
  4. UI refreshes (or optimistically shows the new cards in the Considering column).

GoFast-style means: **all mutations go through APIs** (e.g. `POST /api/tripcrew/[id]/board/parse` or `POST .../board/cards` with a `paste` payload). Auth: only crew members can post; same membership checks as elsewhere.

---

## 5. One board vs multiple boards (topics)

- **Option A – One board per TripCrew:**  
  One set of columns (Considering | Confirmed | Dropped). Cards can be tagged or typed (e.g. “concert”, “weekend”, “city”) so you can filter. Simpler.

- **Option B – Multiple boards per TripCrew (by topic):**  
  e.g. “Summer concerts”, “Weekend getaways”. Each board has its own columns and cards. Closer to your daughter’s “Summer concerts” as a section. More flexible, more complexity.

Recommendation: **start with one board per crew**; add an optional **topic** or **label** on cards (e.g. “Summer concerts”) so the same board can hold multiple themes. If later you want separate boards per topic, we can add a `Board` entity and scope cards to `boardId`.

---

## 6. Schema sketch (board + cards + stages)

**Stages** (enum, same as before, renamed for “board”):

```prisma
enum BoardCardStage {
  CONSIDERING   // Brainstorming
  CONFIRMED     // We’re doing this
  DROPPED       // Rejected / parked
}

model BoardCard {
  id            String         @id @default(uuid())
  tripCrewId    String
  stage         BoardCardStage @default(CONSIDERING)
  position      Int            @default(0)   // Order within column

  title         String         // "Noah Kahan", "Governors Ball"
  dateText      String?        // "July 22nd", "July 31-Aug 2"
  startDate     DateTime?      // Optional normalized
  endDate       DateTime?
  location      String?       // "DC", "NYC", "Montreal, Canada"
  venue         String?       // "Nationals Park", "Lincoln Theatre"
  notes         String?       // Freeform: lineup, transport, "CONFIRMED!!!"

  suggestedById String
  tripId        String?        // When "Create trip from this" (from CONFIRMED)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  tripCrew     TripCrew       @relation(...)
  suggestedBy  Traveler      @relation(...)
  trip         Trip?         @relation(...)
  comments     BoardCardComment[]
  votes        BoardCardVote[]
}
```

**Parse API:**  
Input: `{ paste: "summer concerts\n* noah kahan\n  july 22nd\n  dc\n  nationals park\n  CONFIRMED!!!" }`  
Output: array of `{ title, dateText?, location?, venue?, notes? }` → backend creates N `BoardCard` rows with `stage: CONSIDERING`.

**Move API:**  
`PATCH /api/tripcrew/[id]/board/cards/[cardId]` body `{ stage: "CONFIRMED" }` (and optional `position`).

---

## 7. UX summary

| Action | How |
|--------|-----|
| “Where do you want to go?” | Paste/type → AI parse → create cards in **Considering**. |
| Add one idea | Quick-add form → one card in **Considering**. |
| Discuss / vote | Comments and votes on a card (same as before). |
| Decide | Move card **Considering → Confirmed** (or Dropped). |
| Create trip | From a **Confirmed** card → “Create trip” pre-fills destination/dates and creates a Trip. |

So the crew gets a **Miro-like board** (Considering | Confirmed), **rich cards** that match the concert-list style, and **AI parse** to turn pasted lists into cards the same way we’d do things in GoFast: API-first, clear state, crew-scoped.
