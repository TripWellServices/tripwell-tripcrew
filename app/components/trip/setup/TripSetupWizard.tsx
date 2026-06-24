'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { ScheduleRow } from '@/app/components/planner/concert-wizard-steps'
import type { LodgingCardLodging } from '@/app/components/trip/LodgingCard'
import CoreDetailsStep from '@/app/components/trip/setup/steps/CoreDetailsStep'
import FlightInfoStep from '@/app/components/trip/setup/steps/FlightInfoStep'
import LodgingStep from '@/app/components/trip/setup/steps/LodgingStep'
import MusicEventStep from '@/app/components/trip/setup/steps/MusicEventStep'
import PoiStep from '@/app/components/trip/setup/steps/PoiStep'
import {
  computeSetupStepStatus,
  countCompletedSetupSteps,
  detectMusicTrip,
  type TripSetupFormState,
  type TripSetupStepId,
  visibleSetupSteps,
} from '@/app/components/trip/setup/trip-setup-wizard-steps'
import { dateOnlyToNoonISO } from '@/lib/trip-plan-dates'
import { LocalStorageAPI } from '@/lib/localStorage'
import {
  resolveTripTitle,
  splitLegacyPurposeBlob,
  tripDateRangeLabel,
} from '@/lib/trip/computeTripMetadata'

type LogisticItem = {
  id: string
  title: string
  detail?: string | null
  isComplete: boolean
}

type PoiItem = {
  id: string
  title: string
  category?: string | null
  address?: string | null
  distanceFromLodging?: number | null
  driveTimeMinutes?: number | null
}

export type TripSetupWizardProps = {
  tripId: string
  googleApiKey: string
  catalogueCityId: string | null
  initial: {
    title: string | null
    purpose: string
    city: string | null
    state: string | null
    country: string | null
    startDate: string
    endDate: string
    transportMode: string | null
    startingLocation: string | null
    lodging: LodgingCardLodging | null
    dining: PoiItem[]
    attractions: PoiItem[]
    logistics: LogisticItem[]
    concertId: string | null
    concertName: string
    concertArtist: string
    concertVenue: string
    concertUrl: string
    concertDescription: string
    eventStartDate: string
    eventEndDate: string
    eventStartTime: string
    eventEndTime: string
    isFestival: boolean
    scheduleRows: ScheduleRow[]
  }
}

function dateInputValue(d: Date | string | null | undefined): string {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function findFlightDetail(items: LogisticItem[], title: string): string {
  const item = items.find((i) => i.title.trim().toLowerCase() === title.toLowerCase())
  return item?.detail?.trim() || ''
}

function buildInitialForm(initial: TripSetupWizardProps['initial']): TripSetupFormState {
  const split = splitLegacyPurposeBlob(initial.purpose, initial.title)
  const includesMusicEvent =
    Boolean(initial.concertId) ||
    detectMusicTrip({ title: split.title, purpose: split.purposeText })

  return {
    title: split.title,
    purpose: split.purposeText,
    city: initial.city ?? '',
    state: initial.state ?? '',
    country: initial.country ?? '',
    startDate: dateInputValue(initial.startDate),
    endDate: dateInputValue(initial.endDate),
    transportMode: initial.transportMode ?? '',
    startingLocation: initial.startingLocation ?? '',
    includesMusicEvent,
    concertName: initial.concertName,
    concertArtist: initial.concertArtist,
    concertVenue: initial.concertVenue,
    concertUrl: initial.concertUrl,
    concertDescription: initial.concertDescription,
    eventStartDate: initial.eventStartDate,
    eventEndDate: initial.eventEndDate,
    eventStartTime: initial.eventStartTime,
    eventEndTime: initial.eventEndTime,
    isFestival: initial.isFestival,
    scheduleRows: initial.scheduleRows.length
      ? initial.scheduleRows
      : [
          {
            title: '',
            artist: '',
            stage: '',
            location: '',
            date: '',
            startTime: '',
            endTime: '',
            notes: '',
          },
        ],
    flightOutbound: findFlightDetail(initial.logistics, 'Outbound flight'),
    flightReturn: findFlightDetail(initial.logistics, 'Return flight'),
    flightNotes:
      initial.logistics.find((i) => i.title.trim().toLowerCase() === 'travel notes')?.detail ??
      '',
    lodgingSet: Boolean(initial.lodging),
    poiCount: initial.dining.length + initial.attractions.length,
    logisticsCount: initial.logistics.length,
  }
}

export default function TripSetupWizard({
  tripId,
  googleApiKey,
  catalogueCityId,
  initial,
}: TripSetupWizardProps) {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState<TripSetupStepId>('coreDetails')
  const [form, setForm] = useState<TripSetupFormState>(() => buildInitialForm(initial))
  const [concertId, setConcertId] = useState<string | null>(initial.concertId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = useMemo(
    () => visibleSetupSteps(form.includesMusicEvent),
    [form.includesMusicEvent]
  )

  const completedCount = countCompletedSetupSteps(form, form.includesMusicEvent)
  const headerTitle = form.title.trim() || resolveTripTitle(null, form.purpose)
  const dateLabel = form.startDate && form.endDate
    ? tripDateRangeLabel(form.startDate, form.endDate)
    : ''

  function patchForm(patch: Partial<TripSetupFormState>) {
    setForm((prev) => {
      const next = { ...prev, ...patch }
      if (
        (patch.title !== undefined || patch.purpose !== undefined) &&
        patch.includesMusicEvent === undefined &&
        !initial.concertId
      ) {
        next.includesMusicEvent =
          prev.includesMusicEvent ||
          detectMusicTrip({ title: next.title, purpose: next.purpose })
      }
      if (patch.includesMusicEvent === false && activeStep === 'musicEvent') {
        setActiveStep('flightInfo')
      }
      return next
    })
  }

  function requireTravelerId(): string | null {
    const tid = LocalStorageAPI.getTravelerId()
    if (!tid) {
      setError('Sign in to save changes to this trip.')
      return null
    }
    return tid
  }

  async function saveCoreDetails() {
    setError(null)
    const travelerId = requireTravelerId()
    if (!travelerId) return

    if (!form.title.trim() || !form.city.trim() || !form.startDate || !form.endDate) {
      setError('Trip title, city, and dates are required.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/trip/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelerId,
          title: form.title.trim(),
          purpose: form.purpose.trim() || null,
          city: form.city.trim(),
          state: form.state.trim() || null,
          country: form.country.trim() || null,
          startDate: dateOnlyToNoonISO(form.startDate),
          endDate: dateOnlyToNoonISO(form.endDate),
          transportMode: form.transportMode || null,
          startingLocation: form.startingLocation.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save core details')
      router.refresh()
      advanceAfterSave('coreDetails')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function saveMusicEvent() {
    setError(null)
    const travelerId = requireTravelerId()
    if (!travelerId) return

    if (!form.concertName.trim()) {
      setError('Event name is required.')
      return
    }

    setSaving(true)
    try {
      const scheduleItems = form.scheduleRows
        .map((row, sortOrder) => ({
          title: row.title.trim(),
          artist: row.artist.trim() || null,
          stage: row.stage.trim() || null,
          location: row.location.trim() || null,
          date: row.date || null,
          startTime: row.startTime.trim() || null,
          endTime: row.endTime.trim() || null,
          notes: row.notes.trim() || null,
          sortOrder,
        }))
        .filter((row) => row.title)

      const concertBody = {
        name: form.concertName.trim(),
        artist: form.concertArtist.trim() || null,
        venue: form.concertVenue.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || null,
        url: form.concertUrl.trim() || null,
        description: form.concertDescription.trim() || null,
        eventStartDate: form.eventStartDate || null,
        eventEndDate: form.eventEndDate || form.eventStartDate || null,
        eventStartTime: form.eventStartTime.trim() || null,
        eventEndTime: form.eventEndTime.trim() || null,
        isFestival: form.isFestival,
      }

      let savedConcertId = concertId
      if (savedConcertId) {
        const res = await fetch(`/api/concerts/${savedConcertId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(concertBody),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to update concert')

        if (scheduleItems.length) {
          const schedRes = await fetch(`/api/concerts/${savedConcertId}/schedule`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: scheduleItems }),
          })
          if (!schedRes.ok) {
            const sd = await schedRes.json().catch(() => ({}))
            throw new Error(sd.error || 'Failed to save schedule')
          }
        }
      } else {
        const res = await fetch('/api/concerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...concertBody, scheduleItems }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to create concert')
        savedConcertId = data.id as string
        setConcertId(savedConcertId)

        const anchorRes = await fetch(`/api/trip/${tripId}/concert-anchor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ travelerId, concertId: savedConcertId }),
        })
        const anchorData = await anchorRes.json().catch(() => ({}))
        if (!anchorRes.ok) {
          throw new Error(anchorData.error || 'Failed to link concert to trip')
        }
      }

      router.refresh()
      advanceAfterSave('musicEvent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save music event')
    } finally {
      setSaving(false)
    }
  }

  async function upsertLogistic(title: string, detail: string | null, existing?: LogisticItem) {
    if (existing) {
      await fetch(`/api/trip/${tripId}/logistics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id, title, detail }),
      })
      return
    }
    if (!detail?.trim() && !title.trim()) return
    await fetch(`/api/trip/${tripId}/logistics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, detail: detail?.trim() || null }),
    })
  }

  async function saveFlightInfo() {
    setError(null)
    requireTravelerId()
    setSaving(true)
    try {
      const outboundExisting = initial.logistics.find(
        (i) => i.title.trim().toLowerCase() === 'outbound flight'
      )
      const returnExisting = initial.logistics.find(
        (i) => i.title.trim().toLowerCase() === 'return flight'
      )
      const notesExisting = initial.logistics.find(
        (i) => i.title.trim().toLowerCase() === 'travel notes'
      )

      if (form.flightOutbound.trim()) {
        await upsertLogistic(
          'Outbound flight',
          form.flightOutbound.trim(),
          outboundExisting
        )
      }
      if (form.flightReturn.trim()) {
        await upsertLogistic('Return flight', form.flightReturn.trim(), returnExisting)
      }
      if (form.flightNotes.trim()) {
        await upsertLogistic('Travel notes', form.flightNotes.trim(), notesExisting)
      }

      patchForm({ logisticsCount: initial.logistics.length })
      router.refresh()
      advanceAfterSave('flightInfo')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save travel info')
    } finally {
      setSaving(false)
    }
  }

  function advanceAfterSave(current: TripSetupStepId) {
    const idx = steps.findIndex((s) => s.id === current)
    if (idx >= 0 && idx < steps.length - 1) {
      setActiveStep(steps[idx + 1].id)
      setError(null)
    }
  }

  function renderActiveStep() {
    switch (activeStep) {
      case 'coreDetails':
        return (
          <CoreDetailsStep
            form={form}
            onChange={patchForm}
            onSave={saveCoreDetails}
            saving={saving}
            error={error}
          />
        )
      case 'musicEvent':
        return (
          <MusicEventStep
            form={form}
            onChange={patchForm}
            onSave={saveMusicEvent}
            saving={saving}
            error={error}
            hasExistingConcert={Boolean(concertId)}
          />
        )
      case 'flightInfo':
        return (
          <FlightInfoStep
            form={form}
            items={initial.logistics}
            onChange={patchForm}
            onSave={saveFlightInfo}
            saving={saving}
            error={error}
          />
        )
      case 'lodging':
        return (
          <LodgingStep
            tripId={tripId}
            lodging={initial.lodging}
            googleApiKey={googleApiKey}
          />
        )
      case 'poi':
        return (
          <PoiStep
            tripId={tripId}
            catalogueCityId={catalogueCityId}
            dining={initial.dining}
            attractions={initial.attractions}
            lodgingSet={Boolean(initial.lodging)}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/trip/${tripId}/plan`}
          className="text-sm text-gray-500 hover:text-gray-800 mb-3 inline-block"
        >
          ← View day plan
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{headerTitle}</h1>
        {dateLabel ? (
          <p className="text-sm text-gray-600 mt-1">
            {[form.city, form.state, form.country].filter(Boolean).join(', ')} · {dateLabel}
          </p>
        ) : null}
        <p className="text-sm text-gray-500 mt-2">
          Set up your trip step by step — core details, travel, lodging, then places to go.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sticky top-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Setup steps</h2>
            <nav className="space-y-2">
              {steps.map((step, index) => {
                const isActive = activeStep === step.id
                const status = computeSetupStepStatus(step.id, form)
                const isCompleted = !isActive && status === 'complete'
                const isPartial = !isActive && status === 'partial'
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      setActiveStep(step.id)
                      setError(null)
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-sky-50 border-2 border-sky-500 text-sky-900'
                        : isPartial
                          ? 'bg-amber-50 border border-amber-300 text-amber-950 hover:bg-amber-100'
                          : isCompleted
                            ? 'bg-green-50 border border-green-200 text-green-900 hover:bg-green-100'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isActive
                            ? 'bg-sky-600 text-white'
                            : isCompleted
                              ? 'bg-green-600 text-white'
                              : isPartial
                                ? 'bg-amber-500 text-white'
                                : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        <span className="text-xs font-semibold">
                          {isCompleted ? '✓' : index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">{step.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </nav>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">Progress</span>
                <span className="text-xs text-gray-500">
                  {completedCount} / {steps.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${steps.length ? (completedCount / steps.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            {renderActiveStep()}
          </div>
        </div>
      </div>
    </div>
  )
}
