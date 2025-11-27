# Trip Setup Architecture

**Last Updated**: December 2024  
**Source**: Original TripWell TripBase Model (`docs/Model.md`, `docs/TripData.md`)  
**Pattern**: Free-form strings, computed metadata, safe data storage

---

## Core Principle: **Safe String Storage**

**⚠️ CRITICAL**: All trip metadata fields are stored as **strings** or **numbers** - NOT enums. This prevents data loss and allows flexibility for user input.

---

## TripBase Model Structure (Original)

### Required Fields
```javascript
{
  // Trip Identity
  joinCode: String (required),        // Unique trip identifier
  tripName: String (required),        // User-defined trip name
  purpose: String (required),         // FREE-FORM TEXT - users type custom purposes
  
  // Trip Details
  startDate: Date (required),         // Trip start date
  endDate: Date (required),           // Trip end date
  city: String (required),            // Destination city
  country: String (required),         // Destination country
  
  // Group Information
  partyCount: Number (min: 1),        // Number of travelers
  whoWith: String,                    // "spouse", "friends", "solo", "family", "other"
}
```

### Optional Fields
```javascript
{
  arrivalTime: String,                 // "14:30", "morning", "evening" (MVP2)
  cityId: ObjectId,                    // Reference to City model
}
```

### Computed Fields (Auto-calculated)
```javascript
{
  season: String,                      // "Spring", "Summer", "Fall", "Winter"
  daysTotal: Number,                   // Total trip duration (endDate - startDate + 1)
  dateRange: String,                   // "Sep 23 – Sep 28" (formatted display)
}
```

### Status Flags
```javascript
{
  tripStartedByOriginator: Boolean,   // Has trip been started?
  tripStartedByParticipant: Boolean, // Participant started?
  tripComplete: Boolean,              // Is trip finished?
}
```

---

## Trip Setup Form Structure (Original TripSetup.jsx)

### Form Fields (Matching Original)
1. **Trip Name** (text input, required)
   - Placeholder: "Paris Adventure, Beach Getaway, Family Reunion"
   - Stored as: `tripName` (String)

2. **Purpose** (text input, required)
   - Placeholder: "Anniversary, Birthday, Relaxation"
   - Stored as: `purpose` (String) - **FREE-FORM, NOT ENUM**
   - ⚠️ Users can type ANYTHING - don't restrict with dropdowns

3. **Start Date** (date picker, required)
   - Stored as: `startDate` (Date)

4. **End Date** (date picker, required)
   - Stored as: `endDate` (Date)
   - Validation: Must be after startDate

5. **City** (text input, required)
   - Placeholder: "Paris"
   - Stored as: `city` (String)

6. **State/Country** (text input, required)
   - Placeholder: "France"
   - Stored as: `country` (String)

7. **Party Count** (number input, required)
   - Min: 1
   - Stored as: `partyCount` (Number)

8. **Who With** (radio buttons/dropdown, required)
   - Options: "spouse", "friends", "solo", "family", "other"
   - Stored as: `whoWith` (String) - **NOT ENUM, stored as string**

9. **Join Code** (text input, required)
   - User-defined unique code
   - Validated for availability
   - Stored as: `joinCode` (String)

---

## Data Flow

### 1. User Input → Form Submission
```
TripSetup.jsx (form) 
  → POST /tripwell/trip-setup
  → tripSetupRoute.js (backend)
```

### 2. Backend Processing
```
tripSetupRoute.js:
  1. Validate required fields
  2. Check joinCode availability
  3. Create TripBase document
  4. Run trip parser (parseTrip service)
  5. Compute metadata (season, daysTotal, dateRange)
  6. Link to City model (create if new)
  7. Update user (tripId, role, journeyStage)
  8. Push to JoinCode registry
```

### 3. Trip Parser Logic (Automatic Computations)
```javascript
// parseTrip service computes:
- season: Based on startDate month
  - 3-5: "Spring"
  - 6-8: "Summer"
  - 9-11: "Fall"
  - 12-2: "Winter"

- daysTotal: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1

- dateRange: Formatted string "Sep 23 – Sep 28"
```

### 4. Response & Storage
```
Backend Response:
  - tripId: ObjectId
  - tripData: { computed fields }

Frontend Storage:
  - localStorage.setItem("tripData", JSON.stringify(tripData))
  - localStorage.setItem("userData", JSON.stringify(userData))
```

---

## Critical Design Decisions

### ✅ **DO: Use Free-Form Strings**
- `purpose`: Users type custom purposes ("Anniversary", "Birthday", "Relaxation", "Work Retreat", etc.)
- `city`, `country`: Users type location names
- `whoWith`: Stored as string, validated against enum values but stored as string

### ❌ **DON'T: Use Enums for User Input**
- ❌ `purpose: TripPurpose enum` - TOO RESTRICTIVE
- ❌ `tripType: TripType enum` - Not in original, optional only
- ❌ `budgetLevel: TripBudget enum` - Not in original TripBase

### ✅ **DO: Compute Metadata**
- `season`: Calculated from startDate month
- `daysTotal`: Calculated from date range
- `dateRange`: Formatted for display

### ✅ **DO: Separate City & Country**
- Original has `city` and `country` as separate fields
- `destination` can be computed as `${city}, ${country}` for convenience

---

## TripCrew Version Extensions

### Additional Fields (Not in Original TripBase)
```javascript
{
  // TripCrew-specific
  tripCrewId: String,                  // Links to TripCrew container
  attendees: String[],                 // Array of travelerIds
  
  // Optional enhancements
  tripType: String?,                   // "BEACH", "CITY", etc. (optional)
  budgetLevel: String?,                // "BUDGET", "MODERATE", "LUXURY" (optional)
  notes: String?,                      // Free-form notes
  coverImage: String?,                 // Cover image URL
}
```

**Note**: These are **optional** and **not required** for trip creation. The core TripBase structure must be preserved.

---

## Validation Rules

### Required Fields
- ✅ `tripName` (String, trimmed)
- ✅ `purpose` (String, trimmed, not empty)
- ✅ `city` (String, trimmed)
- ✅ `country` (String, trimmed)
- ✅ `startDate` (Date, valid)
- ✅ `endDate` (Date, valid, after startDate)
- ✅ `partyCount` (Number, >= 1)
- ✅ `whoWith` (String, one of: "spouse", "friends", "solo", "family", "other")

### Optional Fields
- `arrivalTime` (String)
- `tripType` (String)
- `budgetLevel` (String)
- `notes` (String)
- `coverImage` (String)

### Computed Fields (Auto-set)
- `season` (String) - from startDate
- `daysTotal` (Number) - from date range
- `dateRange` (String) - formatted display

---

## Server Action Pattern

### createTripWithMetadata
```typescript
// Input validation
- Verify traveler is TripCrew member
- Validate required fields
- Validate date range

// Data processing
- Trim all string fields
- Calculate season from startDate
- Calculate daysTotal from dates
- Set defaults (partyCount: 1, whoWith: "friends")

// Database creation
- Create Trip with all fields
- Link to TripCrew
- Return trip with computed fields
```

---

## Form Component Structure

### CreateTripModal Component
```
Fields (in order):
1. Trip Name (text, required)
2. Purpose (text, required) - FREE-FORM INPUT
3. City (text, required)
4. Country (text, required)
5. Start Date (date, required)
6. End Date (date, required)
7. Party Count (number, required, min: 1)
8. Who With (dropdown, required)
   - Options: spouse, friends, solo, family, other
9. Trip Type (dropdown, optional) - Not in original
10. Budget Level (dropdown, optional) - Not in original
11. Notes (textarea, optional)
12. Cover Image URL (text, optional)
13. Attendees (multi-select, optional) - TripCrew-specific
```

---

## Key Takeaways

1. **Purpose is FREE-FORM TEXT** - Never use enums for user input
2. **City & Country are SEPARATE** - Don't combine into "destination"
3. **Metadata is COMPUTED** - season, daysTotal calculated automatically
4. **Strings are SAFE** - Store as strings, validate as needed
5. **Original structure is AUTHORITATIVE** - Match TripBase model exactly
6. **Extensions are OPTIONAL** - tripType, budgetLevel are enhancements, not core

---

## References

- **Original Model**: `tripwell-gofastbackend/docs/Model.md`
- **Trip Data Flow**: `tripwell-gofastbackend/docs/TripData.md`
- **TripBase Schema**: `tripwell-gofastbackend/models/TripWell/TripBase.js`
- **TripSetup Route**: `tripwell-gofastbackend/routes/TripWell/tripSetupRoute.js`
- **Original Form**: `TripWell-frontend/src/pages/TripSetup.jsx`

---

## Status: ✅ **ARCHITECTURE DOCUMENTED**

All trip setup fields, validation rules, and data flow patterns are now documented. The schema matches the original TripBase model structure with safe string storage.

