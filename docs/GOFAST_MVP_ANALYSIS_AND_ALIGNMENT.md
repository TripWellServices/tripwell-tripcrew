# GoFast MVP: Top-to-Bottom Analysis & TripWell Alignment

**Source:** `gofastapp-mvp/prisma/schema.prisma` and `lib/domain-runcrew.ts`.  
**Goal:** Align TripWell with GoFast patterns: tenant = company, role on member (junction), invite by slug/URL, no separate role table.

---

## 1. GoFast hierarchy (top to bottom)

```
go_fast_companies (tenant)
  └── Athlete[]  (companyId required — all athletes tie to company)

run_crews (group container)
  ├── joinCode (unique) on model
  ├── handle (unique) — public slug for URLs
  ├── join_codes[] (registry: code, runCrewId, expiresAt, isActive)
  └── run_crew_memberships[] (junction: athleteId, runCrewId, role)
        └── role on the membership (RunCrewRole: member | admin | manager)
```

- **Company = tenant.** Every Athlete has `companyId` → `go_fast_companies`. All things tie to company.
- **RunCrew = group.** Has its own id, name, description, joinCode, handle, and relations.
- **run_crew_memberships = junction.** Links Athlete ↔ RunCrew. **Role lives here** (`role RunCrewRole @default(member)`). There is **no** separate `run_crew_managers` or role table — code explicitly says "run_crew_managers is deprecated"; admin/leader come from memberships where `role = 'admin'`.
- **join_codes** exists in schema (code, runCrewId, expiresAt, isActive), but **invite in product is by handle**: `getRunCrewJoinLink(handle)`, `resolveRunCrewByHandle(handle)`. So join link = slug/URL (handle); code table is legacy or secondary.

---

## 2. GoFast schema (relevant parts)

**Tenant**
```prisma
model go_fast_companies {
  id        String    @id
  name      String?
  slug      String?   @unique
  address   String?
  city      String?
  state     String?
  zip       String?
  domain    String?
  Athlete   Athlete[]
}
```

**Identity (ties to tenant)**
```prisma
model Athlete {
  id           String   @id
  companyId    String   // REQUIRED — all athletes belong to company
  firebaseId   String   @unique
  email        String?
  firstName    String?
  // ...
  go_fast_companies go_fast_companies @relation(fields: [companyId], references: [id], onDelete: Cascade)
  run_crew_memberships run_crew_memberships[]
}
```

**Group container**
```prisma
model run_crews {
  id          String   @id
  name        String
  description String?
  joinCode    String   @unique   // on the model
  handle      String   @unique   // public slug for invite URL
  // ...
  join_codes           join_codes[]
  run_crew_memberships run_crew_memberships[]
}
```

**Junction = membership with role (no separate role table)**
```prisma
model run_crew_memberships {
  id        String      @id
  runCrewId String
  athleteId String
  joinedAt  DateTime    @default(now())
  role      RunCrewRole @default(member)   // ON THE MEMBER
  Athlete   Athlete     @relation(...)
  run_crews run_crews   @relation(...)
  @@unique([runCrewId, athleteId])
  @@index([runCrewId, role])
}

enum RunCrewRole {
  member
  admin
  manager
}
```

**Join code registry (exists but invite is by handle)**
```prisma
model join_codes {
  id        String    @id
  code      String    @unique
  runCrewId String
  expiresAt DateTime?
  isActive  Boolean   @default(true)
  run_crews run_crews @relation(...)
}
```

---

## 3. TripWell alignment

| GoFast | TripWell (current) | Alignment |
|--------|--------------------|-----------|
| **go_fast_companies** | TripWellEnterprise | ✅ **Enterprise = company tenant ID.** All things (Traveler, then crews/trips) should tie to it. Traveler already has `tripWellEnterpriseId`; make it required and ensure all flows respect it. |
| **Athlete** | Traveler | ✅ Universal identity; already tied to Enterprise. |
| **run_crews** | TripCrew | ✅ Group container. Keep as the "crew" entity (name, etc.). |
| **run_crew_memberships** (with **role** on it) | TripCrewMember + TripCrewRole | ❌ **TripCrewRole is deprecated.** Put **role on the member** (TripCrewMember): add `role` (e.g. `member \| admin \| manager`) to TripCrewMember; drop TripCrewRole table and all references. Same pattern as GoFast. |
| **Invite by handle/slug** | JoinCode + join link | **JoinCode deprecated.** Invite = URL with slug (e.g. `/join/{handle}`). No separate join-code table required for the primary flow; optional legacy support only. |
| **join_codes** (in GoFast) | JoinCode | GoFast has it but invite is by **handle**. So: deprecate JoinCode for TripWell; use crew **handle** (or stable slug) in URL; resolve crew by handle. |

---

## 4. Concrete changes (proposal)

### 4.1 TripWellEnterprise = company tenant

- **All things tie to it.** Traveler already has `tripWellEnterpriseId`. In docs and APIs, treat Enterprise as the tenant; any future multi-tenant or org-scoped feature should key off Enterprise.
- Optional: make `tripWellEnterpriseId` required on Traveler (after migration).

### 4.2 Role on member (deprecate TripCrewRole)

- **Add `role` to TripCrewMember** (e.g. `String` or enum `member | admin | manager`), default `member`.
- **Remove TripCrewRole** model and all relations (TripCrew, Traveler). Migrate existing admin/manager into TripCrewMember.role.
- **Admin check:** `tripCrew.memberships.some(m => m.travelerId === currentTravelerId && m.role === 'admin')` — same idea as GoFast.

### 4.3 JoinCode deprecated

- **Invite = URL by slug/handle.** e.g. `/join/{handle}`; resolve crew by handle (add `handle` to TripCrew if not present, unique).
- **Remove or stop using** JoinCode table for new flows; optionally keep for legacy lookups only. No new join-code generation; share link = share URL with handle.

### 4.4 “TripCrew” = junction vs group

- In GoFast, **run_crews** = group container, **run_crew_memberships** = junction (and that’s where “crew” is expressed for a user: “I’m in this crew with this role”).
- In TripWell, keep **TripCrew** as the **group** (the container with name, handle, trips). Keep **TripCrewMember** as the **junction** (traveler ↔ TripCrew + **role**). So:
  - **TripCrew** = the crew entity (like run_crews).
  - **TripCrewMember** = the junction table; it gets the **role** (like run_crew_memberships). No separate TripCrewRole.

---

## 5. Summary

| Item | GoFast | TripWell alignment |
|------|--------|--------------------|
| Company tenant | go_fast_companies; Athlete.companyId | TripWellEnterprise; all things tie to it |
| Identity | Athlete | Traveler |
| Group | run_crews | TripCrew |
| Junction | run_crew_memberships (**role on member**) | TripCrewMember with **role**; deprecate TripCrewRole |
| Invite | By **handle** (slug in URL) | Deprecate JoinCode; invite by handle/slug in URL |
| Join code table | join_codes (exists; invite is handle) | Deprecate JoinCode |

Result: **Enterprise = tenant; role on member (junction); no separate role table; invite by URL/handle; JoinCode deprecated.** Schema and flows stay close to GoFast MVP top to bottom.
