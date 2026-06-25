'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import type { ScheduleRow } from '@/app/components/trip/setup/trip-setup-wizard-steps'
import {
  emptyLineupRow,
  lineupRowsToScheduleItems,
  scheduleItemToLineupRow,
} from '@/lib/concert-lineup'
import {
  emptyFlightRow,
  flightRowsFromInitial,
  flightRowHasData,
} from '@/lib/trip-flight'
import type { LodgingCardLodging } from '@/app/components/trip/LodgingCard'
import CoreDetailsStep from '@/app/components/trip/setup/steps/CoreDetailsStep'
import FlightInfoStep from '@/app/components/trip/setup/steps/FlightInfoStep'
import LodgingStep from '@/app/components/trip/setup/steps/LodgingStep'
import MusicEventStep from '@/app/components/trip/setup/steps/MusicEventStep'
import PoiStep from '@/app/components/trip/setup/steps/PoiStep'
import {
  computeSetupStepStatus,
  countCompletedSetupSteps,
  type TripSetupContextProps,
  type TripSetupFormState,
  type TripSetupStepId,
  visibleSetupSteps,
} from '@/app/components/trip/setup/trip-setup-wizard-steps'
import { dateOnlyToNoonISO } from '@/lib/trip-plan-dates'
import { LocalStorageAPI } from '@/lib/localStorage'
import {
  formatTripTitle,
  inferConcertTripTitle,
} from '@/lib/trip/inferTripTitle'
import {
  resolveTripTitle,
  splitLegacyPurposeBlob,
  tripDateRangeLabel,
} from '@/lib/trip/computeTripMetadata'
import {
  AutosaveStatusBar,
  useTripSetupAutosave,
} from '@/lib/trip/useTripSetupAutosave'
import { UNITED_STATES_COUNTRY } from '@/lib/geo/us-states'

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

type AdventureItem = {
  id: string
  name: string
  category?: string | null
  notes?: string | null
}

type TripFlightItem = {
  id: string
  direction: string
  airlineName?: string | null
  airlineCode?: string | null
  flightNumber?: string | null
  departureAirportCode?: string | null
  arrivalAirportCode?: string | null
  departureTime?: string | Date | null
  arrivalTime?: string | Date | null
  confirmationCode?: string | null
  notes?: string | null
  sortOrder?: number
}

export type TripSetupWizardProps = {
  tripId: string
  googleApiKey: string
  catalogueCityId: string | null
  setupContext: TripSetupContextProps
  defaultLeavingFrom: string | null
  initial: {
    title: string | null
    purpose: string
    city: string | null
    state: string | null
    country: string | null
    startDate: string
    endDate: string
    startingLocation: string | null
    lodging: LodgingCardLodging | null
    dining: PoiItem[]
    attractions: PoiItem[]
    adventures: AdventureItem[]
    flights: TripFlightItem[]
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

function buildInitialForm(
  initial: TripSetupWizardProps['initial'],
  setupContext: TripSetupContextProps,
  defaultLeavingFrom: string | null
): TripSetupFormState {
  const split = splitLegacyPurposeBlob(initial.purpose, initial.title)
  const flightRows = flightRowsFromInitial(
    initial.flights.map((f) => ({
      ...f,
      direction: f.direction as import('@prisma/client').TripFlightDirection,
      airlineName: f.airlineName ?? null,
      airlineCode: f.airlineCode ?? null,
      flightNumber: f.flightNumber ?? null,
      departureAirportCode: f.departureAirportCode ?? null,
      arrivalAirportCode: f.arrivalAirportCode ?? null,
      departureTime: f.departureTime ? new Date(f.departureTime) : null,
      arrivalTime: f.arrivalTime ? new Date(f.arrivalTime) : null,
      confirmationCode: f.confirmationCode ?? null,
      notes: f.notes ?? null,
      sortOrder: f.sortOrder ?? 0,
    }))
  )

  const resolvedTitle =
    split.title ||
    setupContext.inferredTitle ||
    (initial.concertName
      ? inferConcertTripTitle({
          concertName: initial.concertName,
          city: initial.city,
          state: initial.state,
          country: initial.country,
        })
      : '')

  return {
    title: resolvedTitle,
    titleManuallyEdited: Boolean(split.title?.trim()),
    purpose: split.purposeText,
    city: initial.city ?? '',
    state: initial.state ?? '',
    country: initial.country?.trim() || UNITED_STATES_COUNTRY,
    startDate: dateInputValue(initial.startDate),
    endDate: dateInputValue(initial.endDate),
    startingLocation: initial.startingLocation?.trim() || defaultLeavingFrom?.trim() || '',
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
      : [emptyLineupRow()],
    flightRows,
    flightNotes:
      initial.logistics.find((i) => i.title.trim().toLowerCase() === 'travel notes')?.detail ??
      '',
    lodgingSet: Boolean(initial.lodging),
    poiCount:
      initial.dining.length + initial.attractions.length + initial.adventures.length,
    flightCount: initial.flights.length,
    logisticsCount: initial.logistics.length,
  }
}

export default function TripSetupWizard({
  tripId,
  googleApiKey,
  catalogueCityId,
  setupContext,
  defaultLeavingFrom,
  initial,
}: TripSetupWizardProps) {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState<TripSetupStepId>('coreDetails')
  const [form, setForm] = useState<TripSetupFormState>(() =>
    buildInitialForm(initial, setupContext, defaultLeavingFrom)
  )
  const [concertId, setConcertId] = useState<string | null>(
    setupContext.concertId ?? initial.concertId
  )
  const [error, setError] = useState<string | null>(null)

  const showMusicStep = setupContext.showMusicStep
  const steps = useMemo(() => visibleSetupSteps(showMusicStep), [showMusicStep])
  const completedCount = countCompletedSetupSteps(form, showMusicStep)
  const headerTitle = form.title.trim() || resolveTripTitle(null, form.purpose)
  const dateLabel =
    form.startDate && form.endDate ? tripDateRangeLabel(form.startDate, form.endDate) : ''

  function requireTravelerId(): string | null {
    const tid = LocalStorageAPI.getTravelerId()
    if (!tid) {
      setError('Sign in to save changes to this trip.')
      return null
    }
    return tid
  }

  function patchForm(patch: Partial<TripSetupFormState>) {
    setForm((prev) => {
      const next = { ...prev, ...patch }

      if (
        !next.titleManuallyEdited &&
        setupContext.isConcertTrip &&
        (patch.concertName !== undefined ||
          patch.city !== undefined ||
          patch.state !== undefined ||
          patch.country !== undefined)
      ) {
        const name = next.concertName.trim()
        if (name) {
          next.title = inferConcertTripTitle({
            concertName: name,
            city: next.city,
            state: next.state,
            country: next.country,
          })
        }
      }

      return next
    })
  }

  const persistCoreDetails = useCallback(async () => {
    const travelerId = requireTravelerId()
    if (!travelerId) throw new Error('Sign in to save changes to this trip.')
    if (!form.title.trim() || !form.city.trim() || !form.startDate || !form.endDate) {
      throw new Error('Trip title, city, and dates are required.')
    }

    const res = await fetch(`/api/trip/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        travelerId,
        title: formatTripTitle(form.title.trim()),
        purpose: form.purpose.trim() || null,
        city: form.city.trim(),
        state: form.state.trim() || null,
        country: form.country.trim() || null,
        startDate: dateOnlyToNoonISO(form.startDate),
        endDate: dateOnlyToNoonISO(form.endDate),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Failed to save core details')
    setError(null)
    router.refresh()
  }, [form, tripId, router])

  const persistMusicEvent = useCallback(async () => {
    if (!showMusicStep) return
    const travelerId = requireTravelerId()
    if (!travelerId) throw new Error('Sign in to save changes to this trip.')
    if (!form.concertName.trim()) throw new Error('Event name is required.')

    const scheduleItems = lineupRowsToScheduleItems(form.scheduleRows, form.eventStartDate)
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

    setError(null)
    router.refresh()
  }, [concertId, form, router, showMusicStep, tripId])

  const persistFlightInfo = useCallback(async () => {
    const travelerId = requireTravelerId()
    if (!travelerId) throw new Error('Sign in to save changes to this trip.')

    const res = await fetch(`/api/trip/${tripId}/flights`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        travelerId,
        flights: form.flightRows.filter(flightRowHasData),
        travelNotes: form.flightNotes.trim() || null,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Failed to save flights')

    const locRes = await fetch(`/api/trip/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        travelerId,
        startingLocation: form.startingLocation.trim() || null,
      }),
    })
    const locData = await locRes.json().catch(() => ({}))
    if (!locRes.ok) throw new Error(locData.error || 'Failed to save leaving from')

    patchForm({
      flightCount: Array.isArray(data.flights) ? data.flights.length : form.flightRows.length,
    })
    setError(null)
    router.refresh()
  }, [form, router, tripId])

  const coreWatchKey = JSON.stringify({
    title: form.title,
    purpose: form.purpose,
    city: form.city,
    state: form.state,
    country: form.country,
    startDate: form.startDate,
    endDate: form.endDate,
  })

  const musicWatchKey = JSON.stringify({
    concertName: form.concertName,
    concertArtist: form.concertArtist,
    concertVenue: form.concertVenue,
    concertUrl: form.concertUrl,
    concertDescription: form.concertDescription,
    eventStartDate: form.eventStartDate,
    eventEndDate: form.eventEndDate,
    eventStartTime: form.eventStartTime,
    eventEndTime: form.eventEndTime,
    isFestival: form.isFestival,
    scheduleRows: form.scheduleRows,
  })

  const flightWatchKey = JSON.stringify({
    flightRows: form.flightRows,
    flightNotes: form.flightNotes,
    startingLocation: form.startingLocation,
  })

  const coreAutosave = useTripSetupAutosave({
    enabled: activeStep === 'coreDetails',
    watchKey: coreWatchKey,
    onSave: persistCoreDetails,
  })

  const musicAutosave = useTripSetupAutosave({
    enabled: activeStep === 'musicEvent' && showMusicStep,
    watchKey: musicWatchKey,
    onSave: persistMusicEvent,
  })

  const flightAutosave = useTripSetupAutosave({
    enabled: activeStep === 'flightInfo',
    watchKey: flightWatchKey,
    onSave: persistFlightInfo,
  })

  const activeAutosave =
    activeStep === 'coreDetails'
      ? coreAutosave
      : activeStep === 'musicEvent'
        ? musicAutosave
        : activeStep === 'flightInfo'
          ? flightAutosave
          : null

  function renderActiveStep() {
    switch (activeStep) {
      case 'coreDetails':
        return (
          <>
            <CoreDetailsStep
              form={form}
              setupContext={setupContext}
              onChange={patchForm}
              error={error}
            />
            <AutosaveStatusBar
              status={coreAutosave.status}
              errorMessage={coreAutosave.errorMessage}
              onRetry={() => void coreAutosave.saveNow()}
            />
          </>
        )
      case 'musicEvent':
        return (
          <>
            <MusicEventStep
              form={form}
              setupContext={{ ...setupContext, concertId }}
              onChange={patchForm}
              error={error}
            />
            <AutosaveStatusBar
              status={musicAutosave.status}
              errorMessage={musicAutosave.errorMessage}
              onRetry={() => void musicAutosave.saveNow()}
            />
          </>
        )
      case 'flightInfo':
        return (
          <>
            <FlightInfoStep
              tripId={tripId}
              flightRows={form.flightRows}
              flightNotes={form.flightNotes}
              startingLocation={form.startingLocation}
              legacyFlightItems={initial.logistics}
              onChangeFlights={(flightRows) => patchForm({ flightRows })}
              onChangeNotes={(flightNotes) => patchForm({ flightNotes })}
              onChangeStartingLocation={(startingLocation) => patchForm({ startingLocation })}
              error={error}
            />
            <AutosaveStatusBar
              status={flightAutosave.status}
              errorMessage={flightAutosave.errorMessage}
              onRetry={() => void flightAutosave.saveNow()}
            />
          </>
        )
      case 'lodging':
        return (
          <LodgingStep tripId={tripId} lodging={initial.lodging} googleApiKey={googleApiKey} />
        )
      case 'poi':
        return (
          <PoiStep
            tripId={tripId}
            catalogueCityId={catalogueCityId}
            tripCity={form.city}
            tripState={form.state}
            tripCountry={form.country}
            lodgingLat={initial.lodging?.lat ?? null}
            lodgingLng={initial.lodging?.lng ?? null}
            dining={initial.dining}
            attractions={initial.attractions}
            adventures={initial.adventures}
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
          {setupContext.setupOrigin === 'CONCERT_INGEST'
            ? 'Continue setup — core details, flights, stay, then things to do.'
            : 'Set up your trip — core details, flights, stay, then things to do.'}
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

            {activeAutosave?.status === 'saving' ? (
              <p className="mt-3 text-xs text-gray-500">Saving changes…</p>
            ) : null}
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
