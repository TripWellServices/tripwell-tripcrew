# TripCrew Architecture

## Core Principle: TravelerID = Universal Personhood

**Traveler is the universal identity model** - every person in the system is a Traveler, linked to Firebase auth.

**Pattern matches GoFast's Athlete model:**
- Traveler = Universal personhood (like Athlete in GoFast)
- firebaseId = Links to Firebase authentication
- email = Unique identifier
- All other models reference Traveler via ownerId

## Concept (Modeled After RunCrew)

**TripCrew = A shared trip planning group**

- One person (Traveler) creates the TripCrew → becomes the **Owner/Admin**
- TripCrew has a **public URL** for sharing with family/friends
- Others can view the trip via the public URL (view-only by default)
- Owner has full admin access to edit everything
- The TripCrew itself IS the "crew" - it's the shared container for multiple trips

## Database Schema

### Traveler (Universal Personhood)
```prisma
model Traveler {
  id             String     @id @default(uuid())
  firebaseId     String?    @unique  // Links to Firebase auth (REQUIRED for auth)
  email          String?    @unique  // Unique email identifier
  firstName      String?
  lastName       String?
  photoUrl       String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  
  // Relations - Traveler owns everything
  tripCrewsOwned TripCrew[] @relation("TripCrewOwner") // Traveler can own multiple TripCrews
  tripsOwned     Trip[]     @relation("TripOwner")      // Traveler can own trips directly (REQUIRED)
}
```

**Key Points**:
- **Traveler is source of truth** - All identity flows through Traveler
- **firebaseId is REQUIRED** - Links to Firebase authentication
- **Every Trip MUST have ownerId (Traveler)** - Universal personhood
- **Every TripCrew MUST have ownerId (Traveler)** - Universal personhood

### TripCrew (Group Container)
```prisma
model TripCrew {
  id          String   @id @default(uuid())
  name        String
  description String?
  ownerId     String   // Traveler who owns this TripCrew (REQUIRED - universal personhood)
  owner       Traveler @relation("TripCrewOwner", fields: [ownerId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  trips       Trip[]   // Multiple trips can belong to this crew
}
```

**Purpose**: A TripCrew is a group/container that can hold multiple trips. Like a "family travel planning group."

### Trip (Individual Trip)
```prisma
model Trip {
  id          String   @id @default(uuid())
  name        String
  destination String?
  startDate   DateTime?
  endDate     DateTime?
  coverImage  String?
  ownerId     String   // Traveler who owns/created this trip (REQUIRED - universal personhood)
  owner       Traveler @relation("TripOwner", fields: [ownerId], references: [id])
  tripCrewId  String?  // Optional: trip can belong to a TripCrew
  tripCrew    TripCrew? @relation(fields: [tripCrewId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  // ... modules (lodging, dining, attractions, etc.)
}
```

**Key Points**:
- **Every Trip MUST have an ownerId (Traveler)** - This is universal personhood (REQUIRED)
- Trip can optionally belong to a TripCrew (for group organization)
- Trip can exist independently OR as part of a TripCrew
- When creating a Trip, ownerId is ALWAYS required

## Architecture Flow

### For Trip Creator (Owner):
1. Splash → Sign In/Up → Welcome (hydrates Traveler from Firebase)
2. Welcome → "Create TripCrew" → TripCrew Setup Form
3. TripCrew Setup → Creates TripCrew (with ownerId = Traveler) → Redirects to `/tripcrew/[tripCrewId]`
4. TripCrew Hub → "Add Trip" → Creates Trip (with ownerId = Traveler, tripCrewId = TripCrew)
5. Trip View → Owner can share public URL: `/trip/[tripId]` (view-only for others)

### For Family/Friends (Viewers):
1. Receive public URL: `/trip/[tripId]`
2. View trip in read-only mode
3. Can see all modules but cannot edit

## Important Design Decisions

1. **TravelerID is Universal Personhood (Like AthleteID in GoFast)**
   - Every trip has an ownerId (Traveler) - REQUIRED
   - Every TripCrew has an ownerId (Traveler) - REQUIRED
   - Traveler is the source of truth for identity
   - Pattern matches GoFast's Athlete model exactly

2. **Trips Can Be Standalone OR In a Crew**
   - Trip.tripCrewId is optional
   - Trip can exist without a TripCrew (direct ownership via ownerId)
   - Trip can belong to a TripCrew (group organization)
   - But Trip ALWAYS has ownerId (Traveler)

3. **TripCrew is a Container**
   - TripCrew holds multiple trips
   - Useful for organizing trips by group/family
   - Owner can add multiple trips to the crew
   - Each trip still has its own ownerId (Traveler)

## Current Status

### ✅ What's Built:
1. **Splash Page** (`/splash`) - Landing page with sign in/sign up
2. **Sign In/Sign Up** - Firebase auth pages
3. **Welcome Page** (`/welcome`) - Hydrates Traveler from Firebase
4. **TripCrew Setup** (`/tripcrew/setup`) - Create new TripCrew
5. **TripCrew Hub** (`/tripcrew/[tripCrewId]`) - View trips, add new trips
6. **Trip Pages** - Public view and admin view
7. **Trip Modules** - All working (Dining, Attractions, Lodging, Itinerary, Logistics, Pack List, Weather)

### ⚠️ What Needs Fixing:
1. **Schema Migration** - Need to add ownerId back to Trip (currently removed)
2. **Trip Creation** - Ensure all trip creation endpoints set ownerId (Traveler)
3. **Public URL generation** - Generate shareable URLs for trips
4. **Owner verification** - Check if user is trip owner for admin access

## Migration Strategy

Since we have existing data:
1. Make tripCrewId optional (already done)
2. Add ownerId to Trip (REQUIRED, but allow null temporarily for migration)
3. Create migration script to:
   - Find all trips without ownerId
   - Create a default Traveler or link to existing Traveler
   - Set ownerId on all trips
4. Then make ownerId required (non-nullable)

## Next Steps (After Architecture Review)

1. ✅ Document Traveler as universal personhood (this doc)
2. ⏸️ **PAUSE** - Review architecture before proceeding
3. Fix schema to add ownerId back to Trip
4. Update all trip creation endpoints to require ownerId
5. Add public URL display on trip pages
6. Add owner check middleware for admin routes
7. Update seed script to create TripCrew and link trips with ownerId
