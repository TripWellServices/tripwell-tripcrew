# Traveler Model - Complete Schema

## Overview
The `Traveler` model is the universal personhood identity for TripWell (like `Athlete` in GoFast). It stores all user profile information and links to TripWell Enterprises master container.

## Complete Schema

```prisma
model Traveler {
  id                String           @id @default(uuid())
  firebaseId         String?          @unique
  email              String?          @unique
  firstName          String?
  lastName           String?
  photoURL           String?  // Google profile picture URL (from Firebase)
  
  // Profile fields (from OG TripWell ProfileSetup)
  hometownCity       String?
  homeState          String?
  persona            String?          // "Art", "Food", "History", "Adventure"
  planningStyle      String?          // "Spontaneous", "Mix of spontaneous and planned", "Set a plan and stick to it!"
  dreamDestination   String?
  
  tripWellEnterpriseId String?        // Links to TripWell Enterprises master container
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  
  // Relations
  tripWellEnterprise TripWellEnterprise? @relation(fields: [tripWellEnterpriseId], references: [id])
  tripCrewMemberships TripCrewMember[] @relation("TravelerTripCrewMemberships")
  tripCrewRoles       TripCrewRole[]   @relation("TravelerTripCrewRoles")
}
```

## Field Descriptions

### Identity Fields
- `id`: UUID primary key
- `firebaseId`: Firebase Auth UID (unique, nullable)
- `email`: User email (unique, nullable)

### Basic Profile Fields
- `firstName`: User's first name
- `lastName`: User's last name
- `photoURL`: Google profile picture URL from Firebase (synced automatically)

### Extended Profile Fields (from OG TripWell ProfileSetup)
- `hometownCity`: City the user calls home
- `homeState`: US state (2-letter code: "AL", "CA", "NY", etc.)
- `persona`: Travel persona preference
  - Options: `"Art"`, `"Food"`, `"History"`, `"Adventure"`
- `planningStyle`: How user plans/lives out trips
  - Options: 
    - `"Spontaneous"`
    - `"Mix of spontaneous and planned"`
    - `"Set a plan and stick to it!"`
- `dreamDestination`: User's dream travel destination (free text)

### Master Container Link
- `tripWellEnterpriseId`: Links to TripWell Enterprises (master container for all travelers)

### Relations
- `tripWellEnterprise`: Reference to TripWell Enterprises
- `tripCrewMemberships`: Junction table for TripCrew memberships
- `tripCrewRoles`: Junction table for TripCrew admin/manager roles

## Profile Completion Check

A profile is considered **complete** when all of these fields are set:
- `firstName`
- `lastName`
- `hometownCity`
- `homeState`
- `persona`
- `planningStyle`

The `dreamDestination` field is optional.

## Welcome Page Hydration Pattern

The `/welcome` page acts as a **universal hydrator** (like GoFast's athlete-welcome):

1. **Hydrates** traveler data from `/api/auth/hydrate`
2. **Stores** in localStorage:
   - `travelerId`: Traveler UUID
   - `firebaseId`: Firebase UID
   - `email`: User email
   - `traveler`: Full traveler object (JSON)
3. **Checks** profile completion
4. **Redirects** to `/profile/setup` if incomplete, or shows welcome dashboard if complete

## API Endpoints

### POST `/api/auth/hydrate`
- Finds or creates Traveler by `firebaseId`
- Returns full traveler object with all relations
- Used by welcome page for universal hydration

### PUT `/api/traveler/profile`
- Updates traveler profile fields
- Accepts: `firstName`, `lastName`, `hometownCity`, `state`, `persona`, `planningStyle`, `dreamDestination`
- Used by profile setup page

## Usage Pattern

```typescript
// In welcome page or any client component
const traveler = JSON.parse(localStorage.getItem('traveler') || 'null')
const travelerId = localStorage.getItem('travelerId')
const firebaseId = localStorage.getItem('firebaseId')
```

## Migration Notes

- All profile fields are nullable for backward compatibility
- Fields can be added incrementally as user completes profile
- `tripWellEnterpriseId` is optional initially for migration, but should be required for new travelers

