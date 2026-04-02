import type { User } from 'firebase/auth'
import { LocalStorageAPI } from '@/lib/localStorage'
import { TRAVELER_ID_HEADER } from '@/lib/tripwell-request-headers'

/**
 * Welcome gate: resolve `travelerId` like GoFast (`/athlete/me` → `/athlete/create`) before hydrate.
 */
export async function ensureTravelerId(
  firebaseUser: User,
  createProfile?: {
    email?: string | null
    name?: string | null
    picture?: string | null
  }
): Promise<string | null> {
  let tid = LocalStorageAPI.getTravelerId()
  if (tid) return tid

  const token = await firebaseUser.getIdToken()
  const me = await fetch('/api/traveler/me', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (me.ok) {
    const d = (await me.json()) as { travelerId?: string }
    if (d.travelerId) {
      LocalStorageAPI.setTravelerId(d.travelerId)
      return d.travelerId
    }
    return null
  }

  if (me.status === 404) {
    const create = await fetch('/api/traveler/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: createProfile?.email ?? firebaseUser.email,
        name: createProfile?.name ?? firebaseUser.displayName,
        picture: createProfile?.picture ?? firebaseUser.photoURL,
      }),
    })
    if (!create.ok) return null
    const d = (await create.json()) as { travelerId?: string; traveler?: unknown }
    const id = d.travelerId
    if (id) {
      LocalStorageAPI.setTravelerId(id)
      if (d.traveler) {
        LocalStorageAPI.setFullHydrationModel(d.traveler)
      }
      return id
    }
  }

  return null
}

/**
 * POST `/api/auth/hydrate` — Bearer + `x-traveler-id` (GoFast-style).
 * Profile hints are used only when `ensureTravelerId` runs create (404 on `/traveler/me`).
 */
export async function postHydrateTraveler(
  firebaseUser: User,
  profile?: {
    email?: string | null
    name?: string | null
    picture?: string | null
  }
) {
  await ensureTravelerId(firebaseUser, profile)
  const token = await firebaseUser.getIdToken()
  const tid = LocalStorageAPI.getTravelerId()
  if (!tid) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Traveler session not established',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return fetch('/api/auth/hydrate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      [TRAVELER_ID_HEADER]: tid,
    },
    body: JSON.stringify({}),
  })
}

export async function getHydrateTraveler(firebaseUser: User) {
  await ensureTravelerId(firebaseUser)
  const token = await firebaseUser.getIdToken()
  const tid = LocalStorageAPI.getTravelerId()
  if (!tid) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Traveler session not established',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return fetch('/api/auth/hydrate', {
    headers: {
      Authorization: `Bearer ${token}`,
      [TRAVELER_ID_HEADER]: tid,
    },
  })
}
