# TripWell TripCrew Architecture

**Last Updated**: December 2024  
**Pattern**: RunCrew for Travel (modeled after GoFast RunCrew)  
**Identity Model**: Traveler-first (universal personhood)  
**Container Model**: TripWell Enterprise → TripCrew → Trip  
**Invite System**: JoinCode Registry (authoritative source)

---

## Architecture Overview

### Hierarchy (Top to Bottom)

```
TripWell Enterprise (Master Container)
  └── Traveler (Universal Personhood)
        └── TripCrew (Group Container)
              ├── JoinCode (Invite Registry)
              └── Trip (Individual Trip)
                    ├── Lodging (1 per trip)
                    ├── Dining (many per trip)
                    ├── Attraction (many per trip)
                    ├── LogisticItem (many per trip)
                    └── PackItem (many per trip)
```

### Key Design Principles

1. **Traveler-First Identity**: `Traveler` is the universal personhood (like `Athlete` in GoFast)
2. **Container Pattern**: TripWell Enterprise → TripCrew → Trip (nested containers)
3. **Junction Tables**: Many-to-many relationships via `TripCrewMember` and `TripCrewRole`
4. **Trip Modules**: All trip data (Dining, Attraction, Lodging, etc.) belongs to `Trip`
5. **JoinCode Registry**: Authoritative source for invite codes (prevents duplicates, enables expiration)

---

## Invite System (JoinCode Registry)

### ✅ **Implemented: JoinCode Registry Pattern**

Following GoFast's proven pattern, TripWell uses a **JoinCode registry** as the authoritative source for invite codes.

#### JoinCode Model
```prisma
model JoinCode {
  id        String    @id @default(uuid())
  code      String    @unique // Normalized, uppercase code
  tripCrewId String
  tripCrew  TripCrew  @relation(fields: [tripCrewId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())
  expiresAt DateTime? // Optional expiration
  isActive  Boolean   @default(true) // Can deactivate without deleting

  @@index([code])
  @@index([tripCrewId])
  @@map("join_codes")
}
```

#### TripCrew Model (Updated)
```prisma
model TripCrew {
  id                String   @id @default(uuid())
  name              String
  description       String?
  inviteCode        String?  @default(uuid()) @unique // Legacy field (backward compatibility)
  createdByTravelerId String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  memberships       TripCrewMember[]
  roles             TripCrewRole[]
  trips             Trip[]
  joinCodes         JoinCode[] // Registry entries (authoritative)
  
  @@index([inviteCode])
}
```

### Invite Flow

#### 1. **Create TripCrew** → Auto-generates JoinCode
```typescript
// Server Action: createTripCrew()
// - Generates unique 6-character code (e.g., "ABC123")
// - Creates JoinCode registry entry
// - Also sets TripCrew.inviteCode (backward compatibility)
```

#### 2. **Lookup TripCrew** → Via JoinCode Registry
```typescript
// Server Action: lookupTripCrewByCode(code)
// - Normalizes code (uppercase, trimmed)
// - Checks JoinCode registry first
// - Falls back to TripCrew.inviteCode (backward compatibility)
// - Validates: isActive, not expired
// - Returns crew preview (name, member count, admin info)
```

#### 3. **Join TripCrew** → Via JoinCode Registry
```typescript
// Server Action: joinTripCrew(code, travelerId)
// - Looks up via JoinCode registry
// - Validates code is active and not expired
// - Creates TripCrewMember entry
// - Redirects to /tripcrews/[id]
```

#### 4. **Generate Invite Link** → Direct URL
```typescript
// Server Action: generateInviteLink(tripCrewId, travelerId)
// - Gets active JoinCode from registry
// - Returns: /join?code=ABC123
// - Users can share this link directly
```

### Join Page (`/join?code=ABC123`)

**Purpose**: Direct link to join a TripCrew (works for authenticated and unauthenticated users)

**Flow**:
1. User clicks invite link → `/join?code=ABC123`
2. Page loads → Calls `lookupTripCrewByCode(code)`
3. Shows crew preview (name, description, member count, admin)
4. If authenticated → "Join This TripCrew" button
5. If not authenticated → "Sign Up to Join" / "Sign In to Join" buttons
6. After join → Redirects to `/tripcrews/[id]`

**Features**:
- ✅ Works for unauthenticated users (shows sign up/sign in options)
- ✅ Works for authenticated users (direct join)
- ✅ Validates code is active and not expired
- ✅ Shows crew preview before joining
- ✅ Handles invalid/expired codes gracefully

---

## Data Model Relationships

### ✅ **NOT Loose Objects - Properly Connected**

All models are **tightly connected** through foreign keys and relations:

#### 1. Master Container Layer
```prisma
TripWellEnterprise
  ├── id (UUID, generated)
  ├── name: "TripWell Enterprises"
  ├── address: "2604 N. George Mason Dr., Arlington, VA 22207"
  ├── description: "Helping people enjoy traveling through intentional planning and connectedness"
  └── travelers: Traveler[] // All travelers belong here
```

**Purpose**: Single-tenant master container (like GoFastCompany)

#### 2. Identity Layer
```prisma
Traveler
  ├── id (UUID)
  ├── firebaseId (unique, from Firebase Auth)
  ├── email (unique)
  ├── firstName, lastName, photoURL
  ├── hometownCity, homeState, persona, planningStyle, dreamDestination
  ├── tripWellEnterpriseId → TripWellEnterprise // REQUIRED - all travelers linked
  └── Relations:
      ├── tripCrewMemberships: TripCrewMember[] // Many-to-many via junction
      └── tripCrewRoles: TripCrewRole[] // Admin/manager roles
```

**Purpose**: Universal personhood - every user is a Traveler

#### 3. Group Container Layer
```prisma
TripCrew
  ├── id (UUID)
  ├── name, description
  ├── inviteCode (legacy, backward compatibility)
  └── Relations:
      ├── memberships: TripCrewMember[] // Junction table
      ├── roles: TripCrewRole[] // Admin/manager roles
      ├── trips: Trip[] // All trips belong to a TripCrew
      └── joinCodes: JoinCode[] // Invite code registry
```

**Purpose**: Group container (like RunCrew) - "Cole Family", "Friends Trip", etc.

#### 4. JoinCode Registry (NEW)
```prisma
JoinCode
  ├── code (unique, normalized uppercase)
  ├── tripCrewId → TripCrew
  ├── isActive (can deactivate without deleting)
  ├── expiresAt (optional expiration)
  └── createdAt
```

**Purpose**: Authoritative source for invite codes (prevents duplicates, enables expiration)

#### 5. Junction Tables (Many-to-Many)
```prisma
TripCrewMember
  ├── tripCrewId → TripCrew
  ├── travelerId → Traveler
  └── joinedAt, createdAt, updatedAt

TripCrewRole
  ├── tripCrewId → TripCrew
  ├── travelerId → Traveler
  └── role: "admin" | "manager"
```

**Purpose**: Enable many-to-many relationships (travelers can be in multiple crews)

#### 6. Trip Layer
```prisma
Trip
  ├── id (UUID)
  ├── tripCrewId → TripCrew // REQUIRED - trip belongs to a crew
  ├── name, destination, startDate, endDate, coverImage
  └── Relations:
      ├── lodging: Lodging? // 1:1 (one lodging per trip)
      ├── dining: Dining[] // 1:many
      ├── attractions: Attraction[] // 1:many
      ├── logistics: LogisticItem[] // 1:many
      └── packItems: PackItem[] // 1:many
```

**Purpose**: Individual trip container - all trip modules belong here

#### 7. Trip Modules (All Connected to Trip)
```prisma
Lodging
  ├── tripId → Trip (unique, 1:1)
  └── title, address, lat, lng, googlePlaceId, etc.

Dining
  ├── tripId → Trip (many per trip)
  ├── itineraryDay: DateTime? // Optional - assigned to specific day
  └── distanceFromLodging, driveTimeMinutes (calculated)

Attraction
  ├── tripId → Trip (many per trip)
  ├── itineraryDay: DateTime? // Optional - assigned to specific day
  └── distanceFromLodging, driveTimeMinutes (calculated)

LogisticItem
  ├── tripId → Trip
  └── title, detail, isComplete

PackItem
  ├── tripId → Trip
  └── title, isPacked
```

**Purpose**: All trip data is scoped to a specific Trip

---

## Server Actions

### TripCrew Actions (`lib/actions/tripcrew.ts`)

#### ✅ `createTripCrew(data)`
- Creates TripCrew
- Generates unique 6-character join code
- Creates JoinCode registry entry
- Creates membership (creator joins automatically)
- Creates admin role (creator is admin)
- Returns: `{ success, tripCrew, joinCode }`

#### ✅ `getTripCrew(tripCrewId, travelerId)`
- Verifies traveler is a member
- Returns TripCrew with members, roles, trips
- Security: Only members can access

#### ✅ `getTravelerTripCrews(travelerId)`
- Returns all TripCrews traveler belongs to
- Includes trip counts, member counts

#### ✅ `lookupTripCrewByCode(joinCode)` (NEW)
- Normalizes code (uppercase, trimmed)
- Checks JoinCode registry first
- Falls back to TripCrew.inviteCode (backward compatibility)
- Validates: isActive, not expired
- Returns crew preview (name, description, member count, admin info)
- Used by `/join` page

#### ✅ `joinTripCrew(joinCode, travelerId)` (UPDATED)
- Looks up via JoinCode registry
- Validates code is active and not expired
- Checks if already a member
- Creates TripCrewMember entry
- Returns: `{ success, tripCrewId }`

#### ✅ `generateInviteLink(tripCrewId, travelerId)` (UPDATED)
- Verifies requester is admin
- Gets active JoinCode from registry
- Returns: `{ success, inviteUrl, inviteCode }`
- URL format: `/join?code=ABC123`

#### ✅ `addTripCrewMember(tripCrewId, travelerId, email)`
- Only admins can add members
- Finds traveler by email
- Creates membership

---

## Pages & Routes

### ✅ Authentication Flow
- `/` → Redirects to `/splash`
- `/splash` → Landing page (sign in/sign up)
- `/signin` → Sign in page
- `/signup` → Sign up page

### ✅ Core User Flow
- `/welcome` → Universal hydrator → Redirects to `/tripcrews` (after profile check)
- `/profile/setup` → Complete profile → Redirects to `/tripcrews`
- `/profile/settings` → Edit profile

### ✅ TripCrew Pages
- `/tripcrews` → List all TripCrews + Create-or-Join fork
- `/tripcrews/new` → Create TripCrew (single form, no wizard)
- `/tripcrews/[id]` → TripCrew Admin Page (members, trips, invite)
- `/join?code=ABC123` → **NEW** - Direct join page (works for authenticated/unauthenticated)

### ✅ Trip Pages
- `/trip/[tripId]` → Trip detail (public view)
- `/trip/[tripId]/admin` → Trip admin (edit mode)

---

## Navigation Flow

### New User Journey
```
/splash → /signup → /welcome → /profile/setup → /tripcrews → /tripcrews/new → /tripcrews/[id]
```

### Returning User Journey
```
/splash → /signin → /welcome → /tripcrews → 
  ├─ No TripCrews → /tripcrews/new
  └─ Has TripCrews → /tripcrews/[id] (first crew)
```

### Invite Flow (NEW)
```
User receives link: /join?code=ABC123
  ├─ Not authenticated → Shows sign up/sign in options
  └─ Authenticated → Shows "Join This TripCrew" → /tripcrews/[id]
```

---

## JoinCode Generation

### Code Format
- **Length**: 6 characters
- **Characters**: A-Z, 2-9 (removed confusing: 0, O, I, 1)
- **Case**: Uppercase (normalized)
- **Uniqueness**: Enforced by `@@unique` constraint on `JoinCode.code`

### Generation Logic
```typescript
async function generateUniqueJoinCode(): Promise<string> {
  // Try up to 10 times to generate unique code
  // Format: 6 random characters (A-Z, 2-9)
  // Fallback: UUID-based if random fails
}
```

### Registry Benefits
1. **Prevents Duplicates**: Unique constraint on `code`
2. **Enables Expiration**: `expiresAt` field
3. **Can Deactivate**: `isActive` flag (soft delete)
4. **Multiple Codes**: Can have multiple codes per crew (future)
5. **Backward Compatible**: Falls back to `TripCrew.inviteCode`

---

## Security & Multi-Tenancy

### Scoping Pattern

1. **TripWell Enterprise**: Single-tenant master container
2. **Traveler**: Scoped to Enterprise (all travelers belong to same enterprise)
3. **TripCrew**: Scoped to members (via `TripCrewMember` junction)
4. **Trip**: Scoped to TripCrew (via `tripCrewId`)
5. **JoinCode**: Scoped to TripCrew (via `tripCrewId`)

### Query Security

Always scope queries by:
- `travelerId` (from Firebase token)
- `tripCrewId` (from membership check)
- `tripId` (from TripCrew)

**Example**:
```typescript
// Secure query - only get trips from traveler's crews
const trips = await prisma.trip.findMany({
  where: {
    tripCrew: {
      memberships: {
        some: {
          travelerId: authenticatedTravelerId
        }
      }
    }
  }
})
```

---

## LocalStorage API (Client-Side Caching)

### ✅ **Implemented: GoFast Pattern**

Following GoFast's proven localStorage pattern for instant navigation and offline support.

#### LocalStorage Keys (`lib/localStorage.ts`)
```typescript
STORAGE_KEYS = {
  travelerId: 'travelerId',
  firebaseId: 'firebaseId',
  email: 'email',
  traveler: 'traveler', // Full traveler object
  tripCrewId: 'tripCrewId', // Primary TripCrew ID
  tripCrewData: 'tripCrewData', // Full TripCrew object
  tripCrewMemberships: 'tripCrewMemberships', // All memberships
}
```

#### Key Methods
- `setFullHydrationModel(traveler)` - Stores traveler + primary TripCrew
- `getTripCrewId()` - Returns cached TripCrew ID
- `getTripCrewData()` - Returns cached TripCrew object
- `setTripCrewData(crew)` - Stores TripCrew for instant navigation

#### Usage Pattern
1. **Welcome Page** (`/welcome`): Hydrates traveler → Stores in localStorage
2. **TripCrew Admin** (`/tripcrews/[id]`): Reads from localStorage first → Instant render → Fetches fresh data in background
3. **TripCrews List** (`/tripcrews`): Uses cached memberships for instant display

#### Benefits
- ✅ Instant navigation (no loading spinner)
- ✅ Works offline (cached data)
- ✅ Background refresh (updates after initial render)
- ✅ Matches GoFast UX pattern

---

## App Configuration

### ✅ **Implemented: Centralized Config**

#### Config File (`config/appConfig.ts`)
```typescript
export const appConfig = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://tripcrew.tripwell.app',
  getInviteUrl: (code: string) => `${appConfig.baseUrl}/join?code=${code}`,
}
```

**Base URL**: `https://tripcrew.tripwell.app`

Used by:
- `generateInviteLink()` server action
- Invite code scripts
- All invite URL generation

---

## Complete Model List

### ✅ **All Models (Prisma Schema)**

#### 1. **TripWellEnterprise** (Master Container)
- `id` (UUID)
- `name` (default: "TripWell Enterprises")
- `address`, `description`
- `createdAt`, `updatedAt`
- **Relations**: `travelers: Traveler[]`

#### 2. **Traveler** (Universal Personhood)
- `id` (UUID)
- `firebaseId` (unique, from Firebase Auth)
- `email` (unique)
- `firstName`, `lastName`, `photoURL`
- **Profile**: `hometownCity`, `homeState`, `persona`, `planningStyle`, `dreamDestination`
- `tripWellEnterpriseId` → TripWellEnterprise
- `createdAt`, `updatedAt`
- **Relations**: 
  - `tripWellEnterprise: TripWellEnterprise?`
  - `tripCrewMemberships: TripCrewMember[]`
  - `tripCrewRoles: TripCrewRole[]`

#### 3. **TripCrew** (Group Container)
- `id` (UUID)
- `name`, `description`
- `inviteCode` (legacy, backward compatibility)
- `createdByTravelerId`
- `createdAt`, `updatedAt`
- **Relations**:
  - `memberships: TripCrewMember[]`
  - `roles: TripCrewRole[]`
  - `trips: Trip[]`
  - `joinCodes: JoinCode[]`

#### 4. **JoinCode** (Invite Registry)
- `id` (UUID)
- `code` (unique, normalized uppercase)
- `tripCrewId` → TripCrew
- `createdAt`, `expiresAt?`, `isActive`
- **Indexes**: `code`, `tripCrewId`

#### 5. **TripCrewMember** (Junction Table)
- `id` (UUID)
- `tripCrewId` → TripCrew
- `travelerId` → Traveler
- `joinedAt`, `createdAt`, `updatedAt`
- **Unique**: `[tripCrewId, travelerId]`
- **Indexes**: `tripCrewId`, `travelerId`

#### 6. **TripCrewRole** (Junction Table)
- `id` (UUID)
- `tripCrewId` → TripCrew
- `travelerId` → Traveler
- `role` ("admin" | "manager")
- `createdAt`, `updatedAt`
- **Unique**: `[tripCrewId, travelerId]`
- **Indexes**: `tripCrewId`, `travelerId`

#### 7. **Trip** (Individual Trip Container)
- `id` (UUID)
- `tripCrewId` → TripCrew
- `name`, `destination`
- `startDate`, `endDate`, `coverImage`
- `createdAt`, `updatedAt`
- **Relations**:
  - `tripCrew: TripCrew?`
  - `lodging: Lodging?`
  - `dining: Dining[]`
  - `attractions: Attraction[]`
  - `logistics: LogisticItem[]`
  - `packItems: PackItem[]`

#### 8. **Lodging** (1 per Trip)
- `id` (UUID)
- `tripId` → Trip (unique, 1:1)
- `title`, `address`, `website`, `phone`
- `googlePlaceId` (unique)
- `imageUrl`, `rating`
- `lat`, `lng`
- `createdAt`, `updatedAt`
- **Index**: `tripId`

#### 9. **Dining** (Many per Trip)
- `id` (UUID)
- `tripId` → Trip
- `title`, `category`, `address`, `phone`, `website`
- `googlePlaceId` (unique)
- `imageUrl`, `rating`
- `lat`, `lng`
- `distanceFromLodging`, `driveTimeMinutes` (calculated)
- `itineraryDay` (DateTime?, optional day assignment)
- `createdAt`, `updatedAt`
- **Index**: `tripId`

#### 10. **Attraction** (Many per Trip)
- `id` (UUID)
- `tripId` → Trip
- `title`, `category`, `address`, `phone`, `website`
- `googlePlaceId` (unique)
- `imageUrl`, `rating`
- `lat`, `lng`
- `distanceFromLodging`, `driveTimeMinutes` (calculated)
- `itineraryDay` (DateTime?, optional day assignment)
- `createdAt`, `updatedAt`
- **Index**: `tripId`

#### 11. **LogisticItem** (Many per Trip)
- `id` (UUID)
- `tripId` → Trip
- `title`, `detail`
- `isComplete` (boolean)
- `createdAt`, `updatedAt`
- **Index**: `tripId`

#### 12. **PackItem** (Many per Trip)
- `id` (UUID)
- `tripId` → Trip
- `title`
- `isPacked` (boolean)
- `createdAt`, `updatedAt`
- **Index**: `tripId`

---

## Current Implementation Status

### ✅ Completed
- [x] **Database Models**: All 12 models with proper relations
- [x] **JoinCode Registry**: Authoritative invite system
- [x] **Server Actions**: TripCrew CRUD, join, invite
- [x] **LocalStorage API**: Client-side caching (GoFast pattern)
- [x] **App Config**: Centralized base URL
- [x] **Auth Flow**: Splash → Sign In/Up → Welcome → Profile
- [x] **TripCrew Flow**: List → Create/Join → Admin Dashboard
- [x] **Join Page**: `/join?code=ABC123` (works authenticated/unauthenticated)
- [x] **Trip Pages**: `/trip/[tripId]` (public) and `/trip/[tripId]/admin` (edit)

### 🚧 In Progress / Needs Work
- [ ] **Trip Modules**: Full CRUD for Dining, Attraction, Lodging
- [ ] **Google Places Integration**: Hydration endpoints for Dining/Attraction
- [ ] **Weather API**: 7-day forecast endpoint
- [ ] **Itinerary Builder**: Day-by-day planning UI
- [ ] **Trip Admin UI**: Full trip editing interface
- [ ] **Distance Calculation**: Haversine formula for `distanceFromLodging`
- [ ] **Drive Time**: Google Maps API or approximation

### 📋 Future Enhancements
- [ ] Multiple JoinCodes per crew
- [ ] Code expiration UI
- [ ] Code usage tracking
- [ ] Custom code selection (admin chooses code)
- [ ] Trip sharing (public links)
- [ ] Trip templates
- [ ] Collaborative editing (real-time)
- [ ] Mobile app (React Native)

---

## What Needs to Be Created (To Complete Flow)

### 1. **Trip Module Server Actions** (`lib/actions/trip.ts`)
- ✅ `getTrip(tripId)` - Already exists
- ✅ `createTrip(data)` - Already exists
- ❌ `updateTrip(tripId, data)` - **NEEDED**
- ❌ `deleteTrip(tripId)` - **NEEDED**

### 2. **Dining Module** (`lib/actions/dining.ts`)
- ❌ `createDining(tripId, data)` - **NEEDED**
- ❌ `updateDining(diningId, data)` - **NEEDED**
- ❌ `deleteDining(diningId)` - **NEEDED**
- ❌ `assignDiningToDay(diningId, itineraryDay)` - **NEEDED**

### 3. **Attraction Module** (`lib/actions/attraction.ts`)
- ❌ `createAttraction(tripId, data)` - **NEEDED**
- ❌ `updateAttraction(attractionId, data)` - **NEEDED**
- ❌ `deleteAttraction(attractionId)` - **NEEDED**
- ❌ `assignAttractionToDay(attractionId, itineraryDay)` - **NEEDED**

### 4. **Lodging Module** (`lib/actions/lodging.ts`)
- ❌ `createLodging(tripId, data)` - **NEEDED**
- ❌ `updateLodging(tripId, data)` - **NEEDED**
- ❌ `deleteLodging(tripId)` - **NEEDED**

### 5. **Google Places Hydration** (`app/api/hydrate/`)
- ❌ `/api/hydrate/dining/route.ts` - **NEEDED** (POST { placeId, tripId })
- ❌ `/api/hydrate/attractions/route.ts` - **NEEDED** (POST { placeId, tripId })
- ❌ `/api/hydrate/lodging/route.ts` - **NEEDED** (POST { placeId, tripId })

### 6. **Weather API** (`app/api/weather/`)
- ❌ `/api/weather/[tripId]/route.ts` - **NEEDED** (7-day forecast using lodging lat/lng)

### 7. **Distance Calculation** (`lib/distance.ts`)
- ❌ `calculateDistance(lat1, lng1, lat2, lng2)` - Haversine formula - **NEEDED**
- ❌ `calculateDriveTime(lat1, lng1, lat2, lng2)` - Approximation - **NEEDED**

### 8. **Trip Admin UI Components**
- ✅ `TripHeader` - Already exists
- ✅ `LodgingCard` - Already exists
- ✅ `DiningCard` - Already exists
- ✅ `AttractionCard` - Already exists
- ✅ `LogisticsCard` - Already exists
- ✅ `PackListCard` - Already exists
- ✅ `WeatherCard` - Already exists
- ✅ `ItineraryCard` - Already exists
- ✅ `GoogleSearchBar` - Already exists
- ❌ **Edit Forms**: Dining, Attraction, Lodging edit modals - **NEEDED**
- ❌ **Delete Actions**: Delete buttons with confirmation - **NEEDED**

### 9. **Trip Admin Page** (`app/trip/[tripId]/admin/page.tsx`)
- ✅ Page structure exists
- ❌ **Full CRUD**: Create, update, delete for all modules - **NEEDED**
- ❌ **Itinerary Builder**: Drag-and-drop day assignment - **NEEDED**
- ❌ **Google Search Integration**: Search → Hydrate → Add to trip - **NEEDED**

### 10. **Public Trip Page** (`app/trip/[tripId]/page.tsx`)
- ✅ Page structure exists
- ❌ **Read-only View**: Display all modules (no edit buttons) - **NEEDED**
- ❌ **Share Link**: Generate public share link - **NEEDED**

---

## Next Steps (Priority Order)

### Phase 1: Core Trip Functionality
1. ✅ TripCrew system (DONE)
2. ✅ LocalStorage caching (DONE)
3. ❌ **Trip CRUD** (create, update, delete)
4. ❌ **Trip Admin UI** (full editing interface)

### Phase 2: Trip Modules
5. ❌ **Dining CRUD** (create, update, delete, assign to day)
6. ❌ **Attraction CRUD** (create, update, delete, assign to day)
7. ❌ **Lodging CRUD** (create, update, delete)
8. ❌ **Logistics CRUD** (create, update, delete, toggle complete)
9. ❌ **Pack List CRUD** (create, update, delete, toggle packed)

### Phase 3: Google Integration
10. ❌ **Google Places Hydration** (Dining, Attraction, Lodging)
11. ❌ **Distance Calculation** (Haversine formula)
12. ❌ **Drive Time** (approximation or Google Maps API)

### Phase 4: Weather & Itinerary
13. ❌ **Weather API** (7-day forecast)
14. ❌ **Itinerary Builder** (day-by-day planning UI)

### Phase 5: Polish
15. ❌ **Public Trip View** (read-only, shareable)
16. ❌ **Trip Templates** (pre-built trip structures)
17. ❌ **Analytics** (trip views, engagement)

---

## Summary

### ✅ **Architecture is Solid**

- **Not loose objects**: All models are connected via foreign keys
- **Clear hierarchy**: Enterprise → Traveler → TripCrew → Trip → Modules
- **Data integrity**: Cascade deletes, unique constraints, required relationships
- **Scalable**: Junction tables support many-to-many (travelers in multiple crews)
- **Secure**: All queries scoped by traveler/tripCrew/trip
- **Invite System**: JoinCode registry prevents duplicates, enables expiration

### Key Strengths

1. **Traveler-first identity**: Universal personhood (like GoFast Athlete)
2. **Container pattern**: Nested containers (Enterprise → Crew → Trip)
3. **Junction tables**: Proper many-to-many relationships
4. **Module scoping**: All trip data belongs to Trip (no orphaned records)
5. **Database constraints**: Foreign keys enforce relationships
6. **JoinCode registry**: Authoritative source for invites (prevents duplicates)

### No "Loose Objects" - Everything is Connected! ✅
