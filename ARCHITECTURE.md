# TripWell TripCrew Architecture

**Last Updated**: December 2024  
**Pattern**: RunCrew for Travel (modeled after GoFast RunCrew)  
**Identity Model**: Traveler-first (universal personhood)  
**Container Model**: TripWell Enterprise → TripCrew → Trip

---

## Architecture Overview

### Hierarchy (Top to Bottom)

```
TripWell Enterprise (Master Container)
  └── Traveler (Universal Personhood)
        └── TripCrew (Group Container)
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
  └── Relations:
      ├── memberships: TripCrewMember[] // Junction table
      ├── roles: TripCrewRole[] // Admin/manager roles
      └── trips: Trip[] // All trips belong to a TripCrew
```

**Purpose**: Group container (like RunCrew) - "Cole Family", "Friends Trip", etc.

#### 4. Junction Tables (Many-to-Many)
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

#### 5. Trip Layer
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

#### 6. Trip Modules (All Connected to Trip)
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

## Relationship Integrity

### ✅ **All Objects Are Connected**

| Model | Connected To | Relationship Type | Required? |
|-------|-------------|------------------|-----------|
| `Traveler` | `TripWellEnterprise` | Many-to-One | ✅ Yes (via `tripWellEnterpriseId`) |
| `TripCrewMember` | `Traveler` + `TripCrew` | Junction (Many-to-Many) | ✅ Yes |
| `TripCrewRole` | `Traveler` + `TripCrew` | Junction (Many-to-Many) | ✅ Yes |
| `Trip` | `TripCrew` | Many-to-One | ✅ Yes (via `tripCrewId`) |
| `Lodging` | `Trip` | One-to-One | ✅ Yes (via `tripId`, unique) |
| `Dining` | `Trip` | Many-to-One | ✅ Yes (via `tripId`) |
| `Attraction` | `Trip` | Many-to-One | ✅ Yes (via `tripId`) |
| `LogisticItem` | `Trip` | Many-to-One | ✅ Yes (via `tripId`) |
| `PackItem` | `Trip` | Many-to-One | ✅ Yes (via `tripId`) |

**Result**: No orphaned records. Every object has a parent.

---

## Data Flow

### User Journey

1. **Sign Up** → Firebase Auth → `Traveler` created → Linked to `TripWellEnterprise`
2. **Create TripCrew** → `TripCrew` created → `TripCrewMember` created (traveler joins)
3. **Create Trip** → `Trip` created → Linked to `TripCrew`
4. **Add Modules** → `Lodging`, `Dining`, `Attraction`, etc. → All linked to `Trip`

### Query Patterns

#### Get Traveler's TripCrews
```typescript
const traveler = await prisma.traveler.findUnique({
  where: { firebaseId },
  include: {
    tripCrewMemberships: {
      include: {
        tripCrew: {
          include: {
            trips: true
          }
        }
      }
    }
  }
})
```

#### Get Trip with All Modules
```typescript
const trip = await prisma.trip.findUnique({
  where: { id: tripId },
  include: {
    tripCrew: true,
    lodging: true,
    dining: true,
    attractions: true,
    logistics: true,
    packItems: true
  }
})
```

---

## Architecture Assessment

### ✅ **Is "Loose Objects" a Problem? NO**

**Why the architecture is solid:**

1. **Clear Hierarchy**: Enterprise → Traveler → TripCrew → Trip → Modules
2. **Foreign Key Constraints**: All relationships enforced at database level
3. **Cascade Deletes**: Deleting a Trip deletes all modules (via `onDelete: Cascade`)
4. **Junction Tables**: Proper many-to-many relationships (not loose references)
5. **Single Source of Truth**: Each object has one parent (no ambiguity)

### What Makes It "Not Loose"

- ✅ Every `Traveler` **must** belong to `TripWellEnterprise`
- ✅ Every `Trip` **must** belong to a `TripCrew`
- ✅ Every module (`Dining`, `Attraction`, etc.) **must** belong to a `Trip`
- ✅ Junction tables enforce relationships (can't have orphaned memberships)
- ✅ Database constraints prevent invalid relationships

### Comparison to "Loose Objects" (What We're NOT Doing)

❌ **Bad (Loose)**:
- Objects with no parent (orphaned records)
- String references instead of foreign keys
- No cascade deletes (orphaned data)
- Multiple sources of truth

✅ **Good (Current Architecture)**:
- All objects have parents (enforced by FK)
- Foreign key relationships (database-enforced)
- Cascade deletes (data integrity)
- Single source of truth (clear hierarchy)

---

## Module Design

### Trip Modules (All Scoped to Trip)

Each module is **tightly coupled** to its parent `Trip`:

1. **Lodging** (1:1 with Trip)
   - One lodging per trip
   - Used for distance calculations

2. **Dining** (Many:1 with Trip)
   - Multiple restaurants per trip
   - Can be assigned to `itineraryDay`
   - Distance calculated from lodging

3. **Attraction** (Many:1 with Trip)
   - Multiple attractions per trip
   - Can be assigned to `itineraryDay`
   - Distance calculated from lodging

4. **LogisticItem** (Many:1 with Trip)
   - Simple checklist items
   - `isComplete` flag

5. **PackItem** (Many:1 with Trip)
   - Packing checklist
   - `isPacked` flag

**All modules are deleted when Trip is deleted** (cascade delete).

---

## Security & Multi-Tenancy

### Scoping Pattern

1. **TripWell Enterprise**: Single-tenant master container
2. **Traveler**: Scoped to Enterprise (all travelers belong to same enterprise)
3. **TripCrew**: Scoped to members (via `TripCrewMember` junction)
4. **Trip**: Scoped to TripCrew (via `tripCrewId`)

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

## Summary

### ✅ **Architecture is Solid**

- **Not loose objects**: All models are connected via foreign keys
- **Clear hierarchy**: Enterprise → Traveler → TripCrew → Trip → Modules
- **Data integrity**: Cascade deletes, unique constraints, required relationships
- **Scalable**: Junction tables support many-to-many (travelers in multiple crews)
- **Secure**: All queries scoped by traveler/tripCrew/trip

### Key Strengths

1. **Traveler-first identity**: Universal personhood (like GoFast Athlete)
2. **Container pattern**: Nested containers (Enterprise → Crew → Trip)
3. **Junction tables**: Proper many-to-many relationships
4. **Module scoping**: All trip data belongs to Trip (no orphaned records)
5. **Database constraints**: Foreign keys enforce relationships

### No "Loose Objects" - Everything is Connected! ✅

