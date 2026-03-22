'use client'

import { useEffect, useMemo, useState } from 'react'
import ExperienceTripCreator, {
  type DestinationPlannerPrefill,
  type ExperienceAnchorItem,
} from '@/app/components/experiences/ExperienceTripCreator'
export type PlannerPlanScope = 'trip' | 'season'

export interface PlannerProps {
  /** trip = crew trip + destinations; season = SEASON plan container */
  planScope: PlannerPlanScope
  backHref?: string
  initialTripId?: string | null
  /** Hydrate a saved destination guide by citySlug */
  citySlug?: string | null
  experienceWishlistId?: string | null
  initialExperienceItem?: ExperienceAnchorItem
}

type LoadedGuide = {
  id: string
  citySlug: string
  tagline: string | null
  description: string | null
  bestTimeToVisit: string | null
  attractionNames: string[]
  city: { id: string; name: string; state: string | null; country: string | null }
}

export default function Planner({
  planScope,
  backHref,
  initialTripId = null,
  citySlug: citySlugProp,
  experienceWishlistId,
  initialExperienceItem,
}: PlannerProps) {
  const [loadedGuide, setLoadedGuide] = useState<LoadedGuide | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [slugLoading, setSlugLoading] = useState(Boolean(citySlugProp))

  useEffect(() => {
    if (!citySlugProp) {
      setSlugLoading(false)
      return
    }
    let cancelled = false
    setSlugLoading(true)
    setSlugError(null)
    fetch(`/api/city-guides?citySlug=${encodeURIComponent(citySlugProp)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Not found')
        return data.guide as LoadedGuide
      })
      .then((guide) => {
        if (!cancelled) {
          setLoadedGuide(guide)
          setSlugLoading(false)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSlugError(e instanceof Error ? e.message : 'Failed to load destination')
          setSlugLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [citySlugProp])

  const destinationPrefill: DestinationPlannerPrefill | undefined = useMemo(() => {
    if (!loadedGuide) return undefined
    const c = loadedGuide.city
    const whereText = `${c.name}${c.state ? `, ${c.state}` : ''}${c.country ? `, ${c.country}` : ''}`
    return {
      whereText,
      cityId: c.id,
      tagline: loadedGuide.tagline,
      description: loadedGuide.description,
      attractionNames: loadedGuide.attractionNames,
    }
  }, [loadedGuide])

  const isExperience = Boolean(initialExperienceItem || experienceWishlistId)

  if (citySlugProp && slugLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <p className="text-sm text-gray-500">Loading destination…</p>
      </div>
    )
  }

  if (citySlugProp && slugError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-3">
        <p className="text-sm text-red-700">{slugError}</p>
        <a
          href={backHref ?? '/home'}
          className="text-sky-600 text-sm hover:underline"
        >
          ← Back
        </a>
      </div>
    )
  }

  return (
    <ExperienceTripCreator
      initialTripId={initialTripId}
      experienceWishlistId={experienceWishlistId ?? undefined}
      initialItem={initialExperienceItem}
      forceCityFlow={!isExperience}
      destinationPrefill={destinationPrefill}
      planScope={planScope}
      backHref={backHref}
    />
  )
}
