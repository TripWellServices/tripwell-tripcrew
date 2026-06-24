'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LocalStorageAPI } from '@/lib/localStorage'
import { dateOnlyToNoonISO } from '@/lib/trip-plan-dates'
import { concertsListPath } from '@/lib/experience-routes'
import type { ConcertIngestDraft, ConcertInfoIngest } from '@/app/components/planner/concert-ingest-types'
import { coreFromDraft } from '@/app/components/planner/concert-ingest-types'
import {
  composeFestivalDescription,
  emptyLineupRow,
  lineupRowsToScheduleItems,
  tipsFromMultilineText,
} from '@/lib/concert-lineup'
import {
  WIZARD_STEPS,
  countCompletedSteps,
  computeStepStatus,
  type WizardStepId,
  type LineupRow,
  type PoiRow,
} from '@/app/components/planner/concert-wizard-steps'

type ConcertTripWizardProps = {
  initialDraft?: ConcertIngestDraft
}

function stateFromDraft(draft?: ConcertIngestDraft) {
  if (!draft) return null
  const core = coreFromDraft(draft)
  const wd = draft.wizardDefaults
  return {
    core,
    tripName: wd?.tripName?.trim() || core.concertName,
    startDate: wd?.startDate || '',
    endDate: wd?.endDate || '',
    lodgingTitle: wd?.lodgingTitle?.trim() || '',
    lodgingAddress: wd?.lodgingAddress?.trim() || '',
    lodgingCheckIn: wd?.lodgingCheckIn?.trim() || '',
    lodgingCheckOut: wd?.lodgingCheckOut?.trim() || '',
    importedPlan: wd?.importedPlan ?? null,
  }
}

const EMPTY_LINEUP = emptyLineupRow()

const EMPTY_POI: PoiRow = { kind: 'attraction', title: '', category: '' }

function applyIngestDraft(
  draft: ConcertInfoIngest,
  current: {
    tripName: string
    startDate: string
    endDate: string
  }
) {
  return {
    concertName: draft.concertName ?? '',
    artist: draft.artist ?? '',
    venue: draft.venue ?? '',
    city: draft.city ?? '',
    stateUS: draft.state ?? '',
    country: draft.country ?? 'USA',
    concertUrl: draft.concertUrl ?? '',
    eventStartDate: draft.eventStartDate ?? '',
    eventEndDate: draft.eventEndDate ?? draft.eventStartDate ?? '',
    eventStartTime: draft.eventStartTime ?? '',
    eventEndTime: draft.eventEndTime ?? '',
    isFestival: draft.isFestival,
    lineupRows:
      draft.lineup.length > 0 ? draft.lineup : [{ ...EMPTY_LINEUP }],
    bagPolicy: draft.bagPolicy ?? '',
    gettingThere: draft.gettingThere ?? '',
    tipsText: (draft.tips ?? []).join('\n'),
    tripName: draft.concertName ?? current.tripName,
    startDate: draft.eventStartDate ?? current.startDate,
    endDate: draft.eventEndDate ?? draft.eventStartDate ?? current.endDate,
  }
}

export default function ConcertTripWizard({ initialDraft }: ConcertTripWizardProps) {
  const router = useRouter()
  const tripDatesTouched = useRef(false)
  const seeded = stateFromDraft(initialDraft)

  const [activeStep, setActiveStep] = useState<WizardStepId>('concertCore')
  const [concertName, setConcertName] = useState(seeded?.core.concertName ?? '')
  const [artist, setArtist] = useState(seeded?.core.artist ?? '')
  const [venue, setVenue] = useState(seeded?.core.venue ?? '')
  const [description, setDescription] = useState(seeded?.core.description ?? '')
  const [city, setCity] = useState(seeded?.core.city ?? '')
  const [stateUS, setStateUS] = useState(seeded?.core.stateUS ?? '')
  const [country, setCountry] = useState(seeded?.core.country ?? 'USA')
  const [concertUrl, setConcertUrl] = useState(seeded?.core.concertUrl ?? '')
  const [eventStartDate, setEventStartDate] = useState(seeded?.core.eventStartDate ?? '')
  const [eventStartTime, setEventStartTime] = useState(seeded?.core.eventStartTime ?? '')
  const [eventEndDate, setEventEndDate] = useState(seeded?.core.eventEndDate ?? '')
  const [eventEndTime, setEventEndTime] = useState(seeded?.core.eventEndTime ?? '')
  const [isFestival, setIsFestival] = useState(seeded?.core.isFestival ?? false)
  const [lineupRows, setLineupRows] = useState<LineupRow[]>([{ ...EMPTY_LINEUP }])
  const [bagPolicy, setBagPolicy] = useState('')
  const [gettingThere, setGettingThere] = useState('')
  const [tipsText, setTipsText] = useState('')
  const [tripName, setTripName] = useState(seeded?.tripName ?? '')
  const [startDate, setStartDate] = useState(seeded?.startDate ?? '')
  const [endDate, setEndDate] = useState(seeded?.endDate ?? '')
  const [whoWith, setWhoWith] = useState('')
  const [transportMode, setTransportMode] = useState('')
  const [tripNotes, setTripNotes] = useState('')
  const [lodgingTitle, setLodgingTitle] = useState(seeded?.lodgingTitle ?? '')
  const [lodgingAddress, setLodgingAddress] = useState(seeded?.lodgingAddress ?? '')
  const [lodgingCheckIn, setLodgingCheckIn] = useState(seeded?.lodgingCheckIn ?? '')
  const [lodgingCheckOut, setLodgingCheckOut] = useState(seeded?.lodgingCheckOut ?? '')
  const [poiRows, setPoiRows] = useState<PoiRow[]>([{ ...EMPTY_POI }])
  const [blobText, setBlobText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importedPlan] = useState(seeded?.importedPlan ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const formState = {
    concertName,
    artist,
    venue,
    description,
    city,
    stateUS,
    country,
    concertUrl,
    eventStartDate,
    eventStartTime,
    eventEndDate,
    eventEndTime,
    isFestival,
    lineupRows,
    bagPolicy,
    gettingThere,
    tipsText,
    tripName,
    startDate,
    endDate,
    whoWith,
    transportMode,
    tripNotes,
    lodgingTitle,
    lodgingAddress,
    lodgingCheckIn,
    lodgingCheckOut,
    poiRows,
    blobText,
  }

  const completedCount = countCompletedSteps(formState)
  const destinationPreview = [city, stateUS, country].filter(Boolean).join(', ')
  const datesUnset = !startDate && !endDate

  function suggestTripDatesFromConcert(start: string, end: string) {
    if (tripDatesTouched.current) return
    if (start) setStartDate(start)
    if (end) setEndDate(end)
  }

  function handleEventStartDateChange(value: string) {
    setEventStartDate(value)
    if (!eventEndDate || eventEndDate < value) setEventEndDate(value)
    suggestTripDatesFromConcert(value, value)
    if (!tripName.trim() && concertName.trim()) setTripName(concertName.trim())
  }

  function handleConcertNameChange(value: string) {
    setConcertName(value)
    if (!tripName.trim()) setTripName(value)
  }

  function updateLineupRow(index: number, patch: Partial<LineupRow>) {
    setLineupRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  function updatePoiRow(index: number, patch: Partial<PoiRow>) {
    setPoiRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  async function handleParse() {
    setError('')
    if (!blobText.trim() || blobText.trim().length < 20) {
      setError('Paste at least 20 characters to parse.')
      return
    }
    setParsing(true)
    try {
      const res = await fetch('/api/concerts/ingest-lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blob: blobText }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Parse failed')
      const draft = data.draft as ConcertInfoIngest
      const next = applyIngestDraft(draft, { tripName, startDate, endDate })
      setConcertName(next.concertName)
      setArtist(next.artist)
      setVenue(next.venue)
      setCity(next.city)
      setStateUS(next.stateUS)
      setCountry(next.country)
      setConcertUrl(next.concertUrl)
      setEventStartDate(next.eventStartDate)
      setEventEndDate(next.eventEndDate)
      setEventStartTime(next.eventStartTime)
      setEventEndTime(next.eventEndTime)
      setIsFestival(next.isFestival)
      setLineupRows(next.lineupRows)
      setBagPolicy(next.bagPolicy)
      setGettingThere(next.gettingThere)
      setTipsText(next.tipsText)
      if (!tripDatesTouched.current) {
        setStartDate(next.startDate)
        setEndDate(next.endDate)
      }
      if (!tripName.trim()) setTripName(next.tripName)
      setActiveStep('concertCore')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setParsing(false)
    }
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    const tid = LocalStorageAPI.getTravelerId()
    if (!tid) {
      setError('Sign in to save your trip.')
      return
    }
    if (!concertName.trim()) {
      setError('Concert name is required.')
      setActiveStep('concertCore')
      return
    }

    const resolvedTripName = (tripName || concertName).trim()
    const scheduleItems = lineupRowsToScheduleItems(lineupRows, eventStartDate)
    const descriptionText = composeFestivalDescription({
      notes: description,
      bagPolicy,
      gettingThere,
      tips: tipsFromMultilineText(tipsText),
    })

    const wishlistPoi = poiRows
      .map((row) => ({
        kind: row.kind,
        title: row.title.trim(),
        category: row.category.trim() || null,
      }))
      .filter((row) => row.title)

    const lodgingFromForm =
      lodgingTitle.trim() || importedPlan?.lodging?.title
        ? {
            title: lodgingTitle.trim() || importedPlan?.lodging?.title || '',
            address: lodgingAddress.trim() || importedPlan?.lodging?.address || null,
            defaultCheckInTime:
              lodgingCheckIn.trim() || importedPlan?.lodging?.defaultCheckInTime || null,
            defaultCheckOutTime:
              lodgingCheckOut.trim() || importedPlan?.lodging?.defaultCheckOutTime || null,
            chain: importedPlan?.lodging?.chain ?? null,
            lodgingType: importedPlan?.lodging?.lodgingType ?? null,
          }
        : importedPlan?.lodging ?? null

    setSaving(true)
    try {
      const res = await fetch('/api/traveler/trips/ingest-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelerId: tid,
          tripName: resolvedTripName,
          startDate: startDate ? dateOnlyToNoonISO(startDate) : undefined,
          endDate: endDate ? dateOnlyToNoonISO(endDate) : undefined,
          city: city.trim() || null,
          state: stateUS.trim() || null,
          country: country.trim() || null,
          whoWith: whoWith || null,
          transportMode: transportMode || null,
          notes: tripNotes.trim() || importedPlan?.notes?.trim() || null,
          lodging: lodgingFromForm,
          legs: importedPlan?.legs ?? [],
          daySlots: importedPlan?.daySlots ?? [],
          concert: {
            name: concertName.trim(),
            artist: artist.trim() || null,
            venue: venue.trim() || null,
            description: descriptionText.trim() || null,
            city: city.trim() || null,
            state: stateUS.trim() || null,
            country: country.trim() || null,
            url: concertUrl.trim() || null,
            eventStartDate: eventStartDate || null,
            eventStartTime: eventStartTime.trim() || null,
            eventEndDate: eventEndDate || eventStartDate || null,
            eventEndTime: eventEndTime.trim() || null,
            isFestival,
            scheduleItems,
          },
          wishlistPoi,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save trip')
      const id = data.tripId || data.trip?.id || data.id
      if (!id) throw new Error('No trip id returned')
      router.push(`/trip/${id}/admin?ingested=1`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function renderActiveStep() {
    switch (activeStep) {
      case 'concertCore':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Concert core</h3>
              <p className="text-sm text-gray-600">
                Event window can differ from trip travel dates. City resolves server-side.
              </p>
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Concert / event name <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={concertName}
                onChange={(e) => handleConcertNameChange(e.target.value)}
                placeholder="e.g. Osheaga, Noah Kahan"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Artist</span>
                <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Venue</span>
                <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">City</span>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">State / region</span>
                <input type="text" value={stateUS} onChange={(e) => setStateUS(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Country</span>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </label>
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Description / source copy</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ticket notes, lineup copy, or confirmation text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Event URL</span>
              <input type="url" value={concertUrl} onChange={(e) => setConcertUrl(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Event start date</span>
                <input type="date" value={eventStartDate} onChange={(e) => handleEventStartDateChange(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Event start time</span>
                <input type="time" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Event end date</span>
                <input type="date" value={eventEndDate} onChange={(e) => { setEventEndDate(e.target.value); if (!tripDatesTouched.current && e.target.value) setEndDate(e.target.value) }} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Event end time</span>
                <input type="time" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isFestival} onChange={(e) => setIsFestival(e.target.checked)} className="rounded border-gray-300" />
              Multi-day festival
            </label>
          </div>
        )
      case 'concertSchedule':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Festival lineup</h3>
              <p className="text-sm text-gray-600">
                One row per headliner — day number is relative to event start date.
              </p>
            </div>
            <ul className="space-y-4">
              {lineupRows.map((row, index) => (
                <li key={index} className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50/50">
                  <div className="flex gap-2 items-start">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                      <label className="block">
                        <span className="block text-xs text-gray-500 mb-1">Day</span>
                        <input
                          type="number"
                          min={1}
                          value={row.day}
                          onChange={(e) =>
                            updateLineupRow(index, {
                              day: e.target.value ? parseInt(e.target.value, 10) : '',
                            })
                          }
                          placeholder="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-xs text-gray-500 mb-1">Start</span>
                        <input
                          type="time"
                          value={row.startTime}
                          onChange={(e) => updateLineupRow(index, { startTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-xs text-gray-500 mb-1">End</span>
                        <input
                          type="time"
                          value={row.endTime}
                          onChange={(e) => updateLineupRow(index, { endTime: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </label>
                      <label className="block sm:col-span-1 col-span-2">
                        <span className="block text-xs text-gray-500 mb-1">Headliner</span>
                        <input
                          type="text"
                          value={row.headliner}
                          onChange={(e) => updateLineupRow(index, { headliner: e.target.value })}
                          placeholder="Artist name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </label>
                    </div>
                    {lineupRows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setLineupRows((p) => p.filter((_, i) => i !== index))}
                        className="px-2 text-gray-500 hover:text-red-600 text-sm"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setLineupRows((p) => [...p, { ...EMPTY_LINEUP }])}
              className="text-sm text-indigo-700 font-medium hover:underline"
            >
              + Add headliner
            </button>
          </div>
        )
      case 'tripCore':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Trip core</h3>
              <p className="text-sm text-gray-600">Travel dates are independent from concert event dates.</p>
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Trip name</span>
              <input type="text" value={tripName} onChange={(e) => { tripDatesTouched.current = true; setTripName(e.target.value) }} placeholder={concertName || 'My concert trip'} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Trip start</span>
                <input type="date" value={startDate} onChange={(e) => { tripDatesTouched.current = true; setStartDate(e.target.value) }} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Trip end</span>
                <input type="date" value={endDate} onChange={(e) => { tripDatesTouched.current = true; setEndDate(e.target.value) }} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Who</span>
                <select value={whoWith} onChange={(e) => setWhoWith(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                  <option value="">—</option>
                  <option value="SOLO">Solo</option>
                  <option value="SPOUSE">Spouse</option>
                  <option value="FRIENDS">Friends</option>
                  <option value="FAMILY">Family</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Transport</span>
                <select value={transportMode} onChange={(e) => setTransportMode(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                  <option value="">—</option>
                  <option value="CAR">Car</option>
                  <option value="PLANE">Plane</option>
                  <option value="BOAT">Boat</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Trip notes</span>
              <textarea value={tripNotes} onChange={(e) => setTripNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </label>
            {datesUnset ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Trip dates not set — we&apos;ll default from the concert event window or a placeholder range.
              </p>
            ) : null}
          </div>
        )
      case 'destination':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Destination</h3>
              <p className="text-sm text-gray-600">Auto-seeded from concert city on save — no discovery flow.</p>
            </div>
            <p className="text-sm text-gray-800 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
              {destinationPreview ? (
                <>
                  <span className="font-medium">{destinationPreview}</span>
                  {venue ? <span className="text-gray-600"> — anchored near {venue}</span> : null}
                </>
              ) : (
                <span className="text-gray-500">Add a city in Concert core to seed destination.</span>
              )}
            </p>
          </div>
        )
      case 'lodging':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Lodging</h3>
              <p className="text-sm text-gray-600">Saved as a Lodging FK on your trip.</p>
            </div>
            <input type="text" value={lodgingTitle} onChange={(e) => setLodgingTitle(e.target.value)} placeholder="Hotel name" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            <input type="text" value={lodgingAddress} onChange={(e) => setLodgingAddress(e.target.value)} placeholder="Address" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="time" value={lodgingCheckIn} onChange={(e) => setLodgingCheckIn(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg" aria-label="Check-in time" />
              <input type="time" value={lodgingCheckOut} onChange={(e) => setLodgingCheckOut(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg" aria-label="Check-out time" />
            </div>
          </div>
        )
      case 'poi':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Around the show</h3>
              <p className="text-sm text-gray-600">Wishlist POI — unscheduled until the trip builder.</p>
            </div>
            <ul className="space-y-2">
              {poiRows.map((row, index) => (
                <li key={index} className="flex flex-wrap gap-2">
                  <select value={row.kind} onChange={(e) => updatePoiRow(index, { kind: e.target.value as PoiRow['kind'] })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="attraction">Attraction</option>
                    <option value="dining">Dining</option>
                  </select>
                  <input type="text" value={row.title} onChange={(e) => updatePoiRow(index, { title: e.target.value })} placeholder="e.g. Old Port" className="flex-1 min-w-[12rem] px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  {poiRows.length > 1 ? (
                    <button type="button" onClick={() => setPoiRows((p) => p.filter((_, i) => i !== index))} className="px-2 text-gray-500 hover:text-red-600 text-sm">×</button>
                  ) : null}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setPoiRows((p) => [...p, { ...EMPTY_POI }])} className="text-sm text-violet-700 font-medium hover:underline">+ Add POI</button>
          </div>
        )
      case 'paste':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Ingest festival info</h3>
              <p className="text-sm text-gray-600">
                Paste from the festival website — lineup, bag policy, getting there, and tips.
              </p>
            </div>
            <textarea
              value={blobText}
              onChange={(e) => setBlobText(e.target.value)}
              rows={8}
              placeholder="Paste festival FAQ, lineup page, or ticket email…"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => void handleParse()}
              disabled={parsing || blobText.trim().length < 20}
              className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              {parsing ? 'Parsing…' : 'Ingest lineup & info'}
            </button>
            <div className="grid grid-cols-1 gap-3 pt-2 border-t border-gray-100">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Bag policy</span>
                <textarea
                  value={bagPolicy}
                  onChange={(e) => setBagPolicy(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Getting there</span>
                <textarea
                  value={gettingThere}
                  onChange={(e) => setGettingThere(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Tips</span>
                <textarea
                  value={tipsText}
                  onChange={(e) => setTipsText(e.target.value)}
                  rows={3}
                  placeholder="One tip per line"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </label>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link href={concertsListPath()} className="text-sm text-gray-500 hover:text-gray-800 mb-6 inline-block">
        ← Back to Concerts
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Concert trip wizard</h1>
      <p className="text-sm text-gray-600 mb-6">
        Schedule, trip dates, lodging, and POI — save when ready.
      </p>

      {error ? (
        <p className="text-sm text-red-600 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sticky top-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Form Steps</h2>
            <nav className="space-y-2">
              {WIZARD_STEPS.map((step, index) => {
                const isActive = activeStep === step.id
                const status = computeStepStatus(step.id, formState)
                const isCompleted = !isActive && status === 'complete'
                const isPartial = !isActive && status === 'partial'
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStep(step.id)}
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
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive ? 'bg-sky-600 text-white' : isCompleted ? 'bg-green-600 text-white' : isPartial ? 'bg-amber-500 text-white' : 'bg-gray-300 text-gray-600'
                      }`}>
                        <span className="text-xs font-semibold">{isCompleted ? '✓' : index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">{step.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{step.description}</p>
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
                  {completedCount} / {WIZARD_STEPS.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedCount / WIZARD_STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                form="concert-trip-wizard-form"
                disabled={saving || !concertName.trim()}
                className="w-full px-3 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save concert trip'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <form id="concert-trip-wizard-form" onSubmit={(e) => void handleSave(e)}>
              {renderActiveStep()}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
