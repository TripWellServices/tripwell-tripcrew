# TripCrew Architecture

## Concept (Modeled After RunCrew)

**TripCrew = A shared trip planning group**

- One person (Traveler) creates the TripCrew → becomes the **Owner/Admin**
- TripCrew has a **public URL** for sharing with family/friends
- Others can view the trip via the public URL (view-only by default)
- Owner has full admin access to edit everything
- The Trip itself IS the "crew" - it's the shared container

## Current Status

### ✅ What's Built:
1. **Splash Page** (`/splash`) - Landing page with sign in/sign up
2. **Sign In/Sign Up** - Firebase auth pages
3. **Welcome Page** (`/welcome`) - Should hydrate Traveler from Firebase
4. **Trip Pages** - Public view and admin view
5. **Trip Modules** - All working (Dining, Attractions, Lodging, Itinerary, Logistics, Pack List, Weather)

### ❌ What's Missing:
1. **Welcome Page** - Needs to hydrate Traveler from Firebase and link to TravelerID
2. **Trip Setup Flow** - Create a new TripCrew (trip)
3. **Public URL Generation** - Generate shareable URLs for trips
4. **Traveler-Trip Relationship** - Owner creates trip, gets admin access
5. **Join Flow** - Others can view via public URL (view-only)

## Flow

### For Trip Creator (Owner):
1. Splash → Sign In/Up → Welcome (hydrates Traveler)
2. Welcome → "Create Trip" → Trip Setup Form
3. Trip Setup → Creates Trip → Redirects to `/trip/[tripId]?admin=1`
4. Owner can share public URL: `/trip/[tripId]` (view-only for others)

### For Family/Friends (Viewers):
1. Receive public URL: `/trip/[tripId]`
2. View trip in read-only mode
3. Can see all modules but cannot edit

## Database Schema

Current schema is correct:
- `Traveler` - The user (linked to Firebase)
- `Trip` - The trip crew (owned by Traveler)
- All trip modules (Dining, Attractions, Lodging, etc.)

## Next Steps

1. **Complete Welcome Page** - Hydrate Traveler from Firebase
2. **Create Trip Setup Page** - Form to create new trip
3. **Add Public URL Display** - Show shareable link on trip page
4. **Update Trip Pages** - Show admin controls only for owner

