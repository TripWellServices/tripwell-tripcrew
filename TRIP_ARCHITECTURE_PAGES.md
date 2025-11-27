# Trip Architecture - Complete Pages Inventory

**Last Updated**: December 2024  
**Source**: Original TripWell Frontend + Model Documentation  
**Purpose**: Complete inventory of all pages/components in the trip flow

---

## 🎯 **TRIP FLOW - COMPLETE JOURNEY**

### **Phase 1: Trip Setup & Creation**
| Page | Route | Purpose | Status | Models Used |
|------|-------|---------|--------|-------------|
| `TripSetup` | `/tripsetup` | Create trip form | ✅ Exists | `TripBase` |
| `TripCreated` | `/tripcreated` | Trip creation success | ✅ Exists | `TripBase` |
| `TripNotCreated` | `/tripnotcreated` | Trip creation error | ✅ Exists | - |

---

### **Phase 2: Persona & Preferences**
| Page | Route | Purpose | Status | Models Used |
|------|-------|---------|--------|-------------|
| `TripPersonaForm` | `/trip-persona` | Set trip persona preferences | ✅ Exists | `TripPersona` |
| `TripReviewEdit` | `/trip-review-edit` | Review/edit persona | ✅ Exists | `TripPersona` |

**TripPersona Fields:**
- `primaryPersona`: "art", "foodie", "adventure", "history"
- `budget`: Number (daily budget amount)
- `dailySpacing`: Number (0-1) - activity density
- `romanceLevel`: Number (0-1)
- `caretakerRole`: Number (0-1)
- `flexibility`: Number (0-1)

---

### **Phase 3: Meta Attractions Selection**
| Page | Route | Purpose | Status | Models Used |
|------|-------|---------|--------|-------------|
| `TripMetaSelect` | `/meta-select` | Select meta attractions | ✅ Exists | `MetaAttractions`, `UserSelections` |

**MetaAttractions Model:**
- City-specific attraction libraries by season
- Generated once per city/season combination
- Cached for fast lookups
- Used as source for user selection

**UserSelections Model:**
- Tracks selected meta attractions
- Behavior tracking (preferences, selections)
- Links to `MetaAttractions` via selections

---

### **Phase 4: Sample Selection**
| Page | Route | Purpose | Status | Models Used |
|------|-------|---------|--------|-------------|
| `TripSampleSelect` | `/sample-select` | Select samples from generated options | ✅ Exists | `CityStuffToDo`, `SampleSelects` |

**CityStuffToDo Model:**
- Generated samples for cities (content library)
- Generated once per city/season/persona combination
- Contains: `attractions[]`, `restaurants[]`, `neatThings[]`
- Includes metadata (persona weights, budget, etc.)

**SampleSelects Model:**
- User's selected samples from `CityStuffToDo`
- Links to `sampleObjectId` (CityStuffToDo reference)
- Stores `selectedSamples: [String]` (array of sample IDs)

---

### **Phase 5: Itinerary Building**
| Page | Route | Purpose | Status | Models Used |
|------|-------|---------|--------|-------------|
| `TripItineraryBuilder` | `/itinerary-build` | Build day-by-day itinerary | ✅ Exists | `TripDay`, `ItineraryDays` |
| `TripItineraryComplete` | `/itinerary-complete` | Itinerary build success | ✅ Exists | `TripDay` |
| `TripItineraryRequired` | `/tripitineraryrequired` | Redirect if no itinerary | ✅ Exists | - |
| `TripItineraryParticipant` | `/itinerary-participant` | Participant view of itinerary | ✅ Exists | `TripDay` |
| `ItineraryStillBeingBuilt` | `/itinerary-building` | Loading state | ✅ Exists | - |

**TripDay Model:**
- Day-by-day itinerary structure (planning phase)
- `dayIndex`: Number (1, 2, 3...)
- `summary`: String (day summary from GPT)
- `blocks`: { morning, afternoon, evening }
  - Each block: `title`, `description`, `complete: Boolean`
- `isComplete`: Boolean
- `modifiedByUser`: Boolean

**ItineraryDays Model:**
- **Source of Truth** - Raw AI-generated itinerary (Bible)
- Used to generate `TripDay` documents
- Not modified directly by users

---

### **Phase 6: Pre-Trip Planning**
| Page | Route | Purpose | Status | Models Used |
|------|-------|---------|--------|-------------|
| `PreTripHub` | `/pretriphub` | Pre-trip planning dashboard | ✅ Exists | `TripDay`, `TripBase` |
| `TripPreBuild` | `/prepbuild` | Pre-trip preparation | ✅ Exists | `TripDay` |
| `TripPlannerReturn` | `/tripplannerreturn` | Return to planner | ✅ Exists | `TripDay` |
| `ModifyBlockPlanner` | `/modify-block-planner` | Modify itinerary blocks (planning) | ✅ Exists | `TripDay` |
| `ModifyDay` | `/modify-day` | Modify entire day | ✅ Exists | `TripDay` |

---

### **Phase 7: Live Trip Execution**
| Page | Route | Purpose | Status | Models Used |
|------|-------|---------|--------|-------------|
| `LiveDayReturner` | `/livedayreturner` | Welcome back hub for active trips | ✅ Exists | `TripCurrentDays` |
| `PickLiveDay` | `/pickliveday` | Select which day to view | ✅ Exists | `TripCurrentDays` |
| `TripLiveDay` | `/tripliveday` | Live trip day view | ✅ Exists | `TripCurrentDays` |
| `TripLiveDayBlock` | `/tripliveblock` | Individual block view | ✅ Exists | `TripCurrentDays` |
| `TripLiveDayParticipant` | `/triplivedayparticipant` | Participant live day view | ✅ Exists | `TripCurrentDays` |
| `ModifyBlockExecution` | `/modify-block-execution` | Modify blocks during trip | ✅ Exists | `TripCurrentDays` |
| `PreviewLiveDay` | `/previewliveday` | Preview upcoming day | ✅ Exists | `TripCurrentDays` |
| `NextDayPreview` | `/next-day-preview` | Next day preview | ✅ Exists | `TripCurrentDays` |

**TripCurrentDays Model:**
- **Live Trip State** - User-modifiable daily itinerary during trip
- Separate from `TripDay` (planning phase)
- Can be modified in real-time during trip
- Tracks completion status per block

---

### **Phase 8: Reflections & Journaling**
| Page | Route | Purpose | Status | Models Used |
|------|-------|---------|--------|-------------|
| `TripDayLookback` | `/tripdaylookback` | Look back at completed day | ✅ Exists | `TripReflection` |
| `DayLookback` | `/daylookback` | Day reflection view | ✅ Exists | `TripReflection` |
| `CurrentTripReflection` | `/reflections/:tripId` | Current trip reflections | ✅ Exists | `TripReflection` |
| `TripReflectionsHub` | `/reflections` | All reflections hub | ✅ Exists | `TripReflection` |
| `LastDayReflection` | `/last-day-reflection` | Final day reflection | ✅ Exists | `TripReflection` |
| `TripJournal` | `/trip-journal` | Trip journaling | ✅ Exists | `TripReflection` |

**TripReflection Model:**
- Daily reflections and journaling
- `dayIndex`: Number
- `summary`: String (from TripDay)
- `moodTags`: [String]
- `journalText`: String (freeform)

---

### **Phase 9: Trip Completion**
| Page | Route | Purpose | Status | Models Used |
|------|-------|---------|--------|-------------|
| `TripComplete` | `/tripcomplete` | Trip completion screen | ✅ Exists | `TripBase` |

---

## 🎭 **SUPPORTING PAGES**

### **Navigation & Routing**
| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| `LocalUniversalRouter` | `/localrouter` | Smart routing hub | ✅ Exists |
| `FunnelRouter` | `/funnel-router` | Funnel-based routing | ✅ Exists |
| `TripWellHub` | `/tripwellhub` | Main hub | ✅ Exists |
| `MyTrips` | `/my-trips` | All trips list | ✅ Exists |

### **Participant Flow**
| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| `PreJoinTrip` | `/prejointrip` | Pre-join trip screen | ✅ Exists |
| `TripJoin` | `/join` | Join trip with code | ✅ Exists |
| `ProfileParticipant` | `/profileparticipant` | Participant profile | ✅ Exists |
| `PlannerParticipantHub` | `/plannerparticipanthub` | Participant hub | ✅ Exists |

### **Anchors & Highlights**
| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| `AnchorSelect` | `/anchorselect` | Select trip anchors | ✅ Exists |
| `CuratedHighlights` | `/curated-highlights` | Curated highlights | ✅ Exists |

### **Utility Pages**
| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| `TripDaysOverview` | `/trip-days-overview` | Overview of all days | ✅ Exists |
| `TripIntentRequired` | `/tripintent` | Trip intent selection | ✅ Exists |
| `YourStuck` | `/yourstuck` | Help/guidance page | ✅ Exists |

---

## 📊 **DATA MODELS SUMMARY**

### **Core Trip Models**
1. **TripBase** - Trip information, dates, metadata
2. **TripPersona** - User persona preferences per trip
3. **TripDay** - Day-by-day itinerary (planning phase)
4. **TripCurrentDays** - Live trip state (execution phase)
5. **TripReflection** - Daily reflections and journaling

### **Content Models**
6. **MetaAttractions** - City-specific attraction libraries
7. **CityStuffToDo** - Generated samples for cities
8. **UserSelections** - User's selected attractions/samples
9. **SampleSelects** - User's selected samples

### **Supporting Models**
10. **City** - City metadata and references
11. **JoinCode** - Trip join code registry
12. **ItineraryDays** - Raw AI-generated itinerary (source of truth)

---

## 🔄 **COMPLETE USER FLOW**

### **Originator Flow (Trip Creator)**
```
1. ProfileSetup → /profilesetup
2. PostProfileRoleSelect → /postprofileroleselect
3. TripSetup → /tripsetup
4. TripCreated → /tripcreated
5. TripPersonaForm → /trip-persona
6. TripMetaSelect → /meta-select
7. TripSampleSelect → /sample-select
8. TripItineraryBuilder → /itinerary-build
9. TripItineraryComplete → /itinerary-complete
10. PreTripHub → /pretriphub
11. LiveDayReturner → /livedayreturner (when trip starts)
12. TripLiveDay → /tripliveday (during trip)
13. TripDayLookback → /tripdaylookback (after each day)
14. TripComplete → /tripcomplete (when trip ends)
```

### **Participant Flow (Trip Joiner)**
```
1. PreJoinTrip → /prejointrip
2. TripJoin → /join
3. ProfileParticipant → /profileparticipant
4. PlannerParticipantHub → /plannerparticipanthub
5. TripItineraryParticipant → /itinerary-participant
6. TripLiveDayParticipant → /triplivedayparticipant (during trip)
7. TripDayLookback → /tripdaylookback (after each day)
```

---

## 🎯 **TRIPCREW VERSION MAPPING**

### **What We Have (TripCrew MVP)**
- ✅ Trip creation (`/trip/[tripId]/admin`)
- ✅ Trip modules (Lodging, Dining, Attractions, Logistics, PackItems)
- ✅ Basic trip display

### **What's Missing (Downstream Items)**
- ❌ **TripPersona** - Persona preferences form
- ❌ **MetaAttractions** - City attraction selection
- ❌ **CityStuffToDo** - Sample generation and selection
- ❌ **TripDay** - Day-by-day itinerary building
- ❌ **TripCurrentDays** - Live trip execution
- ❌ **TripReflection** - Daily reflections
- ❌ **ItineraryDays** - AI-generated itinerary source

---

## 📋 **PRIORITY BUILD ORDER**

### **Phase 1: Core Trip (✅ DONE)**
- Trip creation
- Trip modules (Lodging, Dining, Attractions, etc.)

### **Phase 2: Persona & Preferences (🚧 NEXT)**
- TripPersona form
- Persona data model

### **Phase 3: Content Selection (📋 FUTURE)**
- MetaAttractions selection
- CityStuffToDo sample generation
- UserSelections tracking

### **Phase 4: Itinerary Building (📋 FUTURE)**
- TripDay model
- ItineraryDays generation
- Day-by-day builder UI

### **Phase 5: Live Trip (📋 FUTURE)**
- TripCurrentDays model
- Live day execution UI
- Block modification during trip

### **Phase 6: Reflections (📋 FUTURE)**
- TripReflection model
- Reflection/journaling UI

---

## 🔗 **KEY RELATIONSHIPS**

```
TripBase
  ├── TripPersona (1:1)
  ├── TripDay (1:many)
  ├── TripCurrentDays (1:many)
  ├── TripReflection (1:many)
  └── cityId → City

City
  ├── MetaAttractions (1:many, by season)
  └── CityStuffToDo (1:many, by season/persona)

UserSelections
  ├── tripId → TripBase
  └── selectedMetas → MetaAttractions

SampleSelects
  ├── tripId → TripBase
  └── sampleObjectId → CityStuffToDo
```

---

## 📝 **NOTES**

- **All pages should be `page.tsx`** (Next.js App Router convention)
- **Models are stored as strings/numbers** - NOT enums (for flexibility)
- **Computed fields** (season, daysTotal) are auto-calculated
- **Planning vs Live** - Separate models for planning (`TripDay`) and execution (`TripCurrentDays`)
- **Source of Truth** - `ItineraryDays` is the raw AI output, never modified directly

---

**Status**: ✅ **COMPLETE INVENTORY DOCUMENTED**

All pages, models, and flow patterns from the original TripWell architecture are now documented.

