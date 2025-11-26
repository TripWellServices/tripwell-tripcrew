# TripCrew Architecture

**Last Updated**: January 2025  
**Schema Status**: ✅ Complete (TripCrew, TripCrewMember, TripCrewRole, Trip)  
**Pattern**: Matching GoFast RunCrew architecture exactly  
**Architecture**: Traveler-first schema - all TripCrew features link back to Traveler model

---

## Core Principle: Traveler = Universal Personhood

**Traveler is the universal identity model** - every person in the system is a Traveler, linked to Firebase auth.

**Pattern matches GoFast's Athlete model:**
- Traveler = Universal personhood (like Athlete in GoFast)
- firebaseId = Links to Firebase authentication
- email = Unique identifier
- All relationships flow through junction tables (membership + roles)

---

## Architecture Philosophy

### Traveler-First Identity

**Key Concept**: All TripCrew features link back to Traveler as central identity.

**Lookup Flow**:
1. **Start with travelerId** → `GET /api/tripcrew` (finds all crews for authenticated traveler)
2. **Transition to tripCrewId** → `GET /api/tripcrew/:id` (tripCrewId becomes primary relationship manager)

**Why This Matters**:
- Initial lookup uses `travelerId` (from Firebase token) to find crews
- Once in crew context, `tripCrewId` is primary
- All relationships within crew (members, roles, trips) use `tripCrewId`
- Security checks still use `travelerId` for auth verification

---

## Database Schema

### Traveler Model (Universal Identity)
**Table**: `travelers`

```prisma
model Traveler {
  id                String           @id @default(uuid())
  firebaseId         String?          @unique
  email              String?          @unique
  firstName          String?
  lastName           String?
  photoURL           String?  // Google profile picture URL (from Firebase)
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  
  // TripCrew Relations (matching GoFast RunCrew pattern)
  tripCrewMemberships TripCrewMember[] @relation("TravelerTripCrewMemberships")
  tripCrewRoles       TripCrewRole[]   @relation("TravelerTripCrewRoles")
}
```

**Key Points**:
- **Traveler is source of truth** - All identity flows through Traveler
- **firebaseId is REQUIRED** - Links to Firebase authentication
- **No direct ownership** - Relationships via junction tables only

### TripCrew Model (Container)
**Table**: `trip_crews`

```prisma
model TripCrew {
  id          String   @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations (matching GoFast RunCrew pattern)
  memberships TripCrewMember[] // Junction table for members
  roles       TripCrewRole[]   // Junction table for admin/manager roles
  trips       Trip[]           // Trips belong to TripCrew
}
```

**Key Fields**:
- `id`: Unique identifier (uuid)
- `name`: Display name of the crew
- `description`: Optional description
- **NO ownerId** - Admin determined via `TripCrewRole` junction table

### TripCrewMember Model (Membership Junction Table)
**Table**: `trip_crew_members`

```prisma
model TripCrewMember {
  id         String   @id @default(uuid())
  tripCrewId String
  travelerId String   // ATHLETE-FIRST: Foreign key to Traveler

  // Timestamps
  joinedAt   DateTime @default(now())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  tripCrew TripCrew @relation(fields: [tripCrewId], references: [id], onDelete: Cascade)
  traveler Traveler @relation("TravelerTripCrewMemberships", fields: [travelerId], references: [id], onDelete: Cascade)

  @@unique([tripCrewId, travelerId]) // Prevent duplicate memberships
  @@map("trip_crew_members")
}
```

**Purpose**: Junction table enabling many-to-many relationship (traveler can be in multiple crews)

**Key Points**:
- **NO role field** - Roles are separate in `TripCrewRole`
- Unique constraint prevents duplicate memberships
- Cascade deletes when TripCrew or Traveler is deleted

### TripCrewRole Model (Roles Junction Table)
**Table**: `trip_crew_roles`

```prisma
model TripCrewRole {
  id         String   @id @default(uuid())
  tripCrewId String
  travelerId String
  role       String   // "admin" | "manager"

  createdAt  DateTime @default(now())

  // Relations
  tripCrew TripCrew @relation(fields: [tripCrewId], references: [id], onDelete: Cascade)
  traveler Traveler @relation("TravelerTripCrewRoles", fields: [travelerId], references: [id], onDelete: Cascade)

  @@unique([tripCrewId, travelerId])
  @@map("trip_crew_roles")
}
```

**Purpose**: Source of truth for admin/manager roles

**Key Points**:
- **Separate from membership** - Roles managed independently
- **Role values**: `"admin"` or `"manager"` (string, not enum)
- **MVP1**: Single admin only (via `TripCrewRole` with role='admin')
- **Future**: Multiple managers via this junction table

### Trip Model (Belongs to TripCrew)
**Table**: `trips`

```prisma
model Trip {
  id          String         @id @default(uuid())
  tripCrewId  String         // Required: trip belongs to a TripCrew
  name        String
  destination String?
  startDate   DateTime?
  endDate     DateTime?
  coverImage  String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  
  // Relations
  tripCrew    TripCrew       @relation(fields: [tripCrewId], references: [id], onDelete: Cascade)
  lodging     Lodging?
  dining      Dining[]
  attractions Attraction[]
  logistics   LogisticItem[]
  packItems   PackItem[]
}
```

**Key Points**:
- **NO ownerId** - Permissions determined via TripCrew roles
- **tripCrewId is REQUIRED** - All trips belong to a TripCrew
- **Cascade delete** - Deleting TripCrew deletes all trips

---

## Role Logic (Following GoFast Pattern)

### Admin Check

```javascript
const isAdmin = tripCrew.roles.some(r => 
  r.travelerId === currentTravelerId && r.role === "admin"
);
```

### Membership Check

```javascript
const isMember = tripCrew.memberships.some(m => 
  m.travelerId === currentTravelerId
);
```

### Viewer (Public)

- Requires no membership or identity
- Public trip pages ignore membership
- Rely solely on admin checks for editing

---

## Key Design Principles

1. **Traveler-First**: All TripCrew features link back to Traveler as central identity
2. **No ownerId**: Admin determined via `TripCrewRole` junction table (matching GoFast)
3. **Separate Concerns**: Membership (`TripCrewMember`) vs Roles (`TripCrewRole`)
4. **Junction Tables**: Many-to-many relationships use junction tables
5. **TripCrew Required**: All trips must belong to a TripCrew (no standalone trips)
6. **Cascade Deletes**: Deleting TripCrew cascades to members, roles, trips, etc.

---

## Permissions Model

### Admin Permissions
- Create/edit/delete trips
- Manage crew members
- Assign roles (future)
- Full access to all trip modules

### Manager Permissions (Future)
- Create/edit trips
- Manage members
- Limited admin capabilities

### Member Permissions
- View trips
- View crew members
- Read-only access

### Public/Viewer Permissions
- View trips via public URL
- Read-only access
- No editing capabilities

---

## API Endpoints (To Be Implemented)

### TripCrew Management
- `POST /api/tripcrew/create` - Create TripCrew (creates membership + admin role)
- `POST /api/tripcrew/join` - Join TripCrew via invite code
- `GET /api/tripcrew/:id` - Hydrate TripCrew (with members, roles, trips)
- `GET /api/tripcrew` - List user's TripCrews

### Trip Management
- `POST /api/tripcrew/:tripCrewId/trips` - Create trip (admin only)
- `GET /api/tripcrew/:tripCrewId/trips` - List trips
- `GET /api/trips/:tripId` - Get trip details
- `PATCH /api/trips/:tripId` - Update trip (admin only)
- `DELETE /api/trips/:tripId` - Delete trip (admin only)

### Membership Management
- `POST /api/tripcrew/:tripCrewId/members` - Add member (admin only)
- `DELETE /api/tripcrew/:tripCrewId/members/:travelerId` - Remove member (admin only)

### Role Management (Future)
- `POST /api/tripcrew/:tripCrewId/roles` - Assign role (admin only)
- `DELETE /api/tripcrew/:tripCrewId/roles/:travelerId` - Remove role (admin only)

---

## Migration Notes

### Breaking Changes
1. **Removed `ownerId` from TripCrew** - Use `TripCrewRole` instead
2. **Removed `ownerId` from Trip** - Use `TripCrew` membership/roles instead
3. **Made `tripCrewId` required on Trip** - All trips must belong to a TripCrew

### Migration Strategy
1. Create `TripCrewMember` records for existing relationships
2. Create `TripCrewRole` records for existing admins
3. Ensure all trips have a `tripCrewId` before making it required
4. Update all API endpoints to use new permission model

---

## Related Documentation

- **GoFast RunCrew Architecture** - Source pattern for this implementation
- **GoFast RunCrewMembership.md** - Membership pattern details
- **GoFast RunCrewManager.md** - Role management pattern

---

**Last Updated**: January 2025  
**Maintained By**: TripWell Development Team
