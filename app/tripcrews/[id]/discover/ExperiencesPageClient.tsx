'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { LocalStorageAPI } from '@/lib/localStorage'
import PlanWizardClient from '../plan/PlanWizardClient'

type WishlistHike = {
  id: string
  name: string
  cityId?: string | null
  trailOrPlace?: string | null
  difficulty?: string | null
  distanceMi?: number | null
  durationMin?: number | null
  routeType?: string | null
  nearestTown?: string | null
}

type WishlistItem = {
  id: string
  title: string
  notes?: string | null
  concert?: {
    id: string
    name: string
    cityId?: string | null
    artist?: string | null
    venue?: string | null
  } | null
  hike?: WishlistHike | null
  dining?: {
    id: string
    title?: string | null
    category?: string | null
    address?: string | null
    cityId?: string | null
  } | null
  attraction?: {
    id: string
    title?: string | null
    category?: string | null
    address?: string | null
    cityId?: string | null
  } | null
}

function routeTypeLabel(t: string | null | undefined): string | null {
  if (!t) return null
  return t.replace(/_/g, ' ')
}

function toWizardItem(item: WishlistItem) {
  return {
    id: item.id,
    title: item.title,
    concert: item.concert
      ? {
          name: item.concert.name,
          cityId: item.concert.cityId ?? null,
        }
      : null,
    hike: item.hike
      ? {
          name: item.hike.name,
          cityId: item.hike.cityId ?? null,
        }
      : null,
    dining: item.dining
      ? {
          name: item.dining.title ?? 'Dining',
          cityId: item.dining.cityId ?? null,
        }
      : null,
    attraction: item.attraction
      ? {
          name: item.attraction.title ?? 'Attraction',
          cityId: item.attraction.cityId ?? null,
        }
      : null,
  }
}

export default function ExperiencesPageClient({
  tripCrewId,
}: {
  tripCrewId: string
}) {
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [wizardItem, setWizardItem] = useState<WishlistItem | null>(null)

  const returnPath = `/tripcrews/${tripCrewId}/discover`

  const load = useCallback(async (tid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/wishlist?travelerId=${tid}`)
      const data = await res.json()
      setItems(data.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const stored = LocalStorageAPI.getTravelerId()
        if (stored) {
          setTravelerId(stored)
          load(stored)
        } else {
          try {
            const res = await fetch(`/api/auth/hydrate?firebaseId=${user.uid}`)
            const data = await res.json()
            const tid = data.traveler?.id ?? null
            setTravelerId(tid)
            if (tid) {
              LocalStorageAPI.setFullHydrationModel(data.traveler)
              load(tid)
            } else setLoading(false)
          } catch {
            setTravelerId(null)
            setLoading(false)
          }
        }
      } else {
        setTravelerId(null)
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [load])

  const { hikes, concerts, dining, attractions } = useMemo(() => {
    const hikes: WishlistItem[] = []
    const concerts: WishlistItem[] = []
    const dining: WishlistItem[] = []
    const attractions: WishlistItem[] = []
    for (const it of items) {
      if (it.hike) hikes.push(it)
      else if (it.concert) concerts.push(it)
      else if (it.dining) dining.push(it)
      else if (it.attraction) attractions.push(it)
    }
    return { hikes, concerts, dining, attractions }
  }, [items])

  async function removeWishlist(id: string) {
    if (!confirm('Remove from your experiences list?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/wishlist?id=${id}`, { method: 'DELETE' })
      if (res.ok && travelerId) load(travelerId)
    } finally {
      setDeletingId(null)
    }
  }

  if (wizardItem) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          type="button"
          onClick={() => setWizardItem(null)}
          className="text-sm text-sky-600 hover:text-sky-800 font-medium mb-4"
        >
          ← Back to Experiences
        </button>
        <PlanWizardClient
          tripCrewId={tripCrewId}
          initialTripId={null}
          initialItem={toWizardItem(wizardItem)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-gray-500 text-sm max-w-xl">
          Your saved hikes, concerts, dining, and attractions. Add more with AI paste,
          browse the catalogue, or build a trip from any bookmark.
        </p>
        <Link
          href={`/tripcrews/${tripCrewId}/discover/add`}
          className="shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
        >
          Browse catalogue
        </Link>
      </div>

      {!travelerId && !loading && (
        <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Sign in to save experiences and see your list here.
        </p>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading your experiences…</p>
      ) : (
        <>
          <ExperienceSection
            title="Hikes"
            emoji="🥾"
            empty="No saved hikes yet."
            addHref={`/tripcrews/${tripCrewId}/hikes/new?return=${encodeURIComponent(returnPath)}`}
            addLabel="Add a hike (discover or paste)"
            secondaryHref={`/tripcrews/${tripCrewId}/discover/add`}
            secondaryLabel="Browse hikes in catalogue"
          >
            {hikes.map((item) => {
              const h = item.hike!
              return (
                <article
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{h.name}</h3>
                    {h.trailOrPlace && (
                      <p className="text-sm text-gray-500 mt-0.5">{h.trailOrPlace}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {h.difficulty && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {h.difficulty}
                        </span>
                      )}
                      {h.distanceMi != null && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {h.distanceMi} mi
                        </span>
                      )}
                      {routeTypeLabel(h.routeType) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {routeTypeLabel(h.routeType)}
                        </span>
                      )}
                      {h.nearestTown && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                          Near {h.nearestTown}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/tripcrews/${tripCrewId}/hikes/${h.id}/day-plan?return=${encodeURIComponent(returnPath)}`}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                    >
                      Plan a day
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeWishlist(item.id)}
                      disabled={deletingId === item.id}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              )
            })}
          </ExperienceSection>

          <ExperienceSection
            title="Concerts"
            emoji="🎵"
            empty="No saved concerts yet."
            addHref={`/tripcrews/${tripCrewId}/discover/add`}
            addLabel="Browse concerts"
          >
            {concerts.map((item) => {
              const c = item.concert!
              return (
                <article
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                    <p className="text-sm text-gray-500 truncate">
                      {[c.artist, c.venue].filter(Boolean).join(' · ') || item.title}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setWizardItem(item)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700"
                    >
                      Build a trip
                    </button>
                    <button
                      type="button"
                      onClick={() => removeWishlist(item.id)}
                      disabled={deletingId === item.id}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              )
            })}
          </ExperienceSection>

          <ExperienceSection
            title="Dining"
            emoji="🍽️"
            empty="No saved dining yet."
            addHref={`/tripcrews/${tripCrewId}/discover/add`}
            addLabel="Browse dining"
          >
            {dining.map((item) => {
              const d = item.dining!
              const name = d.title ?? item.title
              return (
                <article
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
                    <p className="text-sm text-gray-500 truncate">
                      {[d.category, d.address].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setWizardItem(item)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700"
                    >
                      Build a trip
                    </button>
                    <button
                      type="button"
                      onClick={() => removeWishlist(item.id)}
                      disabled={deletingId === item.id}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              )
            })}
          </ExperienceSection>

          <ExperienceSection
            title="Attractions"
            emoji="🏛️"
            empty="No saved attractions yet."
            addHref={`/tripcrews/${tripCrewId}/discover/add`}
            addLabel="Browse attractions"
          >
            {attractions.map((item) => {
              const a = item.attraction!
              const name = a.title ?? item.title
              return (
                <article
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
                    <p className="text-sm text-gray-500 truncate">
                      {[a.category, a.address].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setWizardItem(item)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700"
                    >
                      Build a trip
                    </button>
                    <button
                      type="button"
                      onClick={() => removeWishlist(item.id)}
                      disabled={deletingId === item.id}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              )
            })}
          </ExperienceSection>
        </>
      )}
    </div>
  )
}

function ExperienceSection({
  title,
  emoji,
  empty,
  addHref,
  addLabel,
  secondaryHref,
  secondaryLabel,
  children,
}: {
  title: string
  emoji: string
  empty: string
  addHref: string
  addLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  children: React.ReactNode
}) {
  const hasItems = React.Children.toArray(children).length > 0

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>{emoji}</span>
          {title}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href={addHref}
            className="text-sm px-3 py-1.5 rounded-lg border border-sky-200 text-sky-700 font-medium hover:bg-sky-50"
          >
            {addLabel}
          </Link>
          {secondaryHref && secondaryLabel && (
            <Link
              href={secondaryHref}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
      {!hasItems ? (
        <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl px-4 py-6 text-center bg-gray-50/50">
          {empty}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
      )}
    </section>
  )
}
