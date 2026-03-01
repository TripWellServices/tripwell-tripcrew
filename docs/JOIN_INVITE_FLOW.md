# Join / Invite Flow (GoFast-style)

**Principle:** Invite = share a **URL**. State lives in the URL. No “paste code then sign in then enter TripCrew” — open link → sign in if needed (redirect back to same link) → join.

---

## Canonical flow

1. **Admin** clicks “Invite Member” on a TripCrew → we generate an **invite URL**:  
   `https://tripcrew.tripwell.app/join/ABC123` (slug = join code).
2. **Invitee** opens that link (email, message, etc.).
3. **App** serves `/join/[code]` → redirects to `/join?code=ABC123` (state in URL).
4. **Join page** looks up TripCrew by code, shows preview. If user is **signed in** → “Join This TripCrew”. If **not** → “Sign Up to Join” / “Sign In to Join” with `?redirect=/join?code=ABC123`.
5. **Sign-in / Sign-up** honor `redirect`; after auth they send the user to that URL (back to the join page with code in state).
6. User clicks **Join This TripCrew** → API join → redirect to `/tripcrews/{tripCrewId}`.

So: **one link, state in URL, no manual paste.**

---

## Deprecated: paste-code on TripCrews page

The “Enter invite code” box on the TripCrews page is **deprecated**. Primary path is “open the invite link you received.” We keep a small “Have a code to paste instead?” for backwards compatibility; that flow still works but is not the main UX.

---

## Config

- **Invite URL:** `appConfig.getInviteUrl(slugOrCode)` → `{baseUrl}/join/{slug}`. Primary = **handle** (slug, e.g. `/join/boston-crew`); legacy = join code (e.g. `/join/ABC123`). Lookup tries handle first, then code.
- **Redirect safety:** Sign-in and sign-up only redirect to relative paths (e.g. `/join?code=...`), not arbitrary URLs.

---

## Routes

| Route | Purpose |
|-------|--------|
| `/join/[code]` | Slug invite link; redirects to `/join?code=...`. |
| `/join?code=XXX` | Join page with code in query; shows preview and Join / Sign in / Sign up. |
| `/join` (no code) | “Open your invite link” message + link back to TripCrews. |
