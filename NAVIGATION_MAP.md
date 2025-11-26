# TripWell Navigation Map

**Last Updated**: December 2024

## Current Pages Inventory

### 🔐 Authentication Flow
| Route | Purpose | Status | Redirects To |
|-------|---------|--------|--------------|
| `/` | Root | ✅ Redirects to `/splash` | `/splash` |
| `/splash` | Landing page | ✅ | `/signin` or `/signup` |
| `/signin` | Sign in | ✅ | `/welcome` |
| `/signup` | Sign up | ✅ | `/welcome` |

### 🏠 Core User Flow
| Route | Purpose | Status | Redirects To |
|-------|---------|--------|--------------|
| `/welcome` | Universal hydrator + welcome | ✅ | Profile setup OR TripCrew setup OR first TripCrew |
| `/profile/setup` | Complete profile | ✅ | **→ `/tripcrews/new`** (NEW) |
| `/profile/settings` | Edit profile | ✅ | Back to `/welcome` |

### 👥 TripCrew Pages
| Route | Purpose | Status | Notes |
|-------|---------|--------|-------|
| `/tripcrews` | List all TripCrews | 🚧 Placeholder | Needs implementation |
| `/tripcrews/new` | Create TripCrew (3-step wizard) | ✅ Step 1 done | Steps 2-3 placeholder |
| `/tripcrews/[id]` | TripCrew admin/overview | 🚧 Placeholder | Needs full implementation |
| `/tripcrew/setup` | **OLD** - Duplicate | ⚠️ Deprecated | Use `/tripcrews/new` |
| `/tripcrew/[tripCrewId]` | **OLD** - Duplicate | ⚠️ Deprecated | Use `/tripcrews/[id]` |

### 🧳 Trip Pages
| Route | Purpose | Status | Notes |
|-------|---------|--------|-------|
| `/trip/[tripId]` | Trip detail (public view) | ✅ | Shows all modules |
| `/trip/[tripId]/admin` | Trip admin (edit mode) | ✅ | `?admin=1` mode |

### 🚫 Missing Pages
| Route | Purpose | Status | Priority |
|-------|---------|--------|----------|
| `/home` or `/traveler-home` | Traveler home dashboard | ❌ Missing | **HIGH** - Main landing after auth |
| `/tripcrews/[id]/members` | Member management | ❌ Missing | Medium |
| `/tripcrews/[id]/settings` | TripCrew settings | ❌ Missing | Low |

---

## Navigation Flow

### New User Journey
```
/splash → /signup → /welcome → /profile/setup → /tripcrews/new → /tripcrews/[id]
```

### Returning User Journey
```
/splash → /signin → /welcome → 
  ├─ Profile incomplete → /profile/setup → /tripcrews/new
  ├─ No TripCrews → /tripcrews/new
  └─ Has TripCrews → /tripcrews/[id] (first crew)
```

### After Profile Setup
```
/profile/setup → /tripcrews/new (NEW - default)
```

### TripCrew Setup Fallback
```
/tripcrews/new → (if not ready) → /home (soft fallback)
```

---

## Routing Logic

### Welcome Page (`/welcome`)
**Current Logic:**
1. Hydrate traveler
2. Check profile complete
3. If incomplete → `/profile/setup`
4. If complete + has TripCrews → first TripCrew
5. If complete + no TripCrews → `/tripcrews/new`

**Should Be:**
1. Hydrate traveler
2. Check profile complete
3. If incomplete → `/profile/setup`
4. If complete → **`/home`** (traveler home dashboard)
   - Shows all TripCrews
   - Shows recent trips
   - "Create TripCrew" button

### Profile Setup (`/profile/setup`)
**Current:** Redirects to `/welcome`
**Should Be:** Redirects to `/tripcrews/new` (default flow)

### TripCrew New (`/tripcrews/new`)
**Current:** No fallback
**Should Be:** If user cancels/not ready → `/home` (soft fallback)

---

## Recommended Navigation Structure

### Primary Navigation (After Auth)
```
/home (Traveler Home)
  ├─ My TripCrews
  ├─ Recent Trips
  └─ Create TripCrew

/tripcrews/[id] (TripCrew Admin)
  ├─ Crew Info
  ├─ Members
  ├─ Trips
  └─ Settings

/trip/[tripId] (Trip Detail)
  ├─ Trip Header
  ├─ Modules (Lodging, Dining, etc.)
  └─ Admin Actions
```

### Secondary Navigation
```
/profile/settings (Profile)
/welcome (Hydration only - redirects immediately)
```

---

## Action Items

1. ✅ **Update `/profile/setup` redirect** → `/tripcrews/new`
2. ✅ **Add soft fallback to `/tripcrews/new`** → `/home`
3. ❌ **Create `/home` page** (Traveler Home Dashboard)
4. ❌ **Update `/welcome` routing** → redirect to `/home` after hydration
5. ⚠️ **Clean up duplicate routes** (`/tripcrew` vs `/tripcrews`)

---

## Page Status Summary

| Page | Status | Needs Work |
|------|--------|------------|
| `/splash` | ✅ | - |
| `/signin` | ✅ | - |
| `/signup` | ✅ | - |
| `/welcome` | ✅ | Update routing logic |
| `/profile/setup` | ✅ | Update redirect |
| `/profile/settings` | ✅ | - |
| `/tripcrews` | 🚧 | Full implementation |
| `/tripcrews/new` | ✅ | Add fallback |
| `/tripcrews/[id]` | 🚧 | Full implementation |
| `/trip/[tripId]` | ✅ | - |
| `/trip/[tripId]/admin` | ✅ | - |
| `/home` | ❌ | **CREATE THIS** |

