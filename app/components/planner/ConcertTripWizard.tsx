'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LocalStorageAPI } from '@/lib/localStorage'
import type { ParsedTripPlan } from '@/lib/trip-plan-model'
import { dateOnlyToNoonISO } from '@/lib/trip-plan-dates'
import { concertsListPath } from '@/lib/experience-routes'
import {
  WIZARD_STEPS,
  countCompletedSteps,
  computeStepStatus,
  type WizardStepId,
  type ScheduleRow,
  type PoiRow,
} from '@/app/components/planner/concert-wizard-steps'

const EMPTY_SCHEDULE: ScheduleRow = {
  title: '',
  artist: '',
  stage: '',
  location: '',
  date: '',
  startTime: '',
  endTime: '',
  notes: '',
}

const EMPTY_POI: PoiRow = { kind: 'attraction', title: '', category: '' }

function applyParseToFields(
  plan: ParsedTripPlan,
  current: {
    concertName: string
    artist: string
    venue: string
    city: string
    stateUS: string
    country: string
    eventStartDate: string
    eventEndDate: string
    tripName: string
    startDate: string
    endDate: string
  }
) {
  const anchor = plan.eventAnchor
  const eventStart = anchor?.eventDate || plan.startDate || current.eventStartDate
  return {
    concertName: anchor?.name || plan.tripName?.trim() || current.concertName,
    artist: anchor?.artist || current.artist,
    venue: anchor?.venue || current.venue,
    city: plan.city?.trim() || current.city,
    stateUS: plan.state?.trim() || current.stateUS,
    country: plan.country?.trim() || current.country || 'USA',
    eventStartDate: eventStart,
    eventEndDate: eventStart || current.eventEndDate,
    tripName: plan.tripName?.trim() || anchor?.name || current.tripName,
    startDate: plan.startDate || current.startDate,
    endDate: plan.endDate || current.endDate,
  }
}

export default function ConcertTripWizard() {
  const router = useRouter()
  const tripDatesTouched = useRef(false)

  const [activeStep, setActiveStep] = useState<WizardStepId>('concertCore')
  const [concertName, setConcertName] = useState('')
  const [artist, setArtist] = useState('')
  const [venue, setVenue] = useState('')
  const [city, setCity] = useState('')
  const [stateUS, setStateUS] = useState('')
  const [country, setCountry] = useState('USA')
  const [concertUrl, setConcertUrl] = useState('')
  const [eventStartDate, setEventStartDate] = useState('')
  const [eventStartTime, setEventStartTime] = useState('')
  const [eventEndDate, setEventEndDate] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')
  const [isFestival, setIsFestival] = useState(false)
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([{ ...EMPTY_SCHEDULE }])
  const [tripName, setTripName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [whoWith, setWhoWith] = useState('')
  const [transportMode, setTransportMode] = useState('')
  const [tripNotes, setTripNotes] = useState('')
  const [lodgingTitle, setLodgingTitle] = useState('')
  const [lodgingAddress, setLodgingAddress] = useState('')
  const [lodgingCheckIn, setLodgingCheckIn] = useState('')
  const [lodgingCheckOut, setLodgingCheckOut] = useState('')
  const [poiRows, setPoiRows] = useState<PoiRow[]>([{ ...EMPTY_POI }])
  const [blobText, setBlobText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importedPlan, setImportedPlan] = useState<ParsedTripPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const formState = {
    concertName,
    artist,
    venue,
    city,
    stateUS,
    country,
    concertUrl,
    eventStartDate,
    eventStartTime,
    eventEndDate,
    eventEndTime,
    isFestival,
    scheduleRows,
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

  function updateScheduleRow(index: number, patch: Partial<ScheduleRow>) {
    setScheduleRows((prev) =>
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
      const res = await fetch('/api/plan/parse-blob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blob: blobText }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Parse failed')
      const plan = data.parsed as ParsedTripPlan
      setImportedPlan(plan)
      const next = applyParseToFields(plan, {
        concertName,
        artist,
        venue,
        city,
        stateUS,
        country,
        eventStartDate,
        eventEndDate,
        tripName,
        startDate,
        endDate,
      })
      setConcertName(next.concertName)
      setArtist(next.artist)
      setVenue(next.venue)
      setCity(next.city)
      setStateUS(next.stateUS)
      setCountry(next.country)
      setEventStartDate(next.eventStartDate)
      setEventEndDate(next.eventEndDate)
      if (!tripDatesTouched.current) {
        setStartDate(next.startDate)
        setEndDate(next.endDate)
      }
      if (!tripName.trim()) setTripName(next.tripName)
      if (plan.lodging?.title) {
        setLodgingTitle(plan.lodging.title)
        setLodgingAddress(plan.lodging.address ?? '')
        setLodgingCheckIn(plan.lodging.defaultCheckInTime ?? '')
        setLodgingCheckOut(plan.lodging.defaultCheckOutTime ?? '')
      }
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
    const scheduleItems = scheduleRows
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
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Concert schedule</h3>
              <p className="text-sm text-gray-600">Openers, stages, day sets — like race expo schedule rows.</p>
            </div>
            <ul className="space-y-4">
              {scheduleRows.map((row, index) => (
                <li key={index} className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50/50">
                  <div className="flex gap-2 items-start">
                    <input type="text" value={row.title} onChange={(e) => updateScheduleRow(index, { title: e.target.value })} placeholder="Set title / headliner" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    {scheduleRows.length > 1 ? (
                      <button type="button" onClick={() => setScheduleRows((p) => p.filter((_, i) => i !== index))} className="px-2 text-gray-500 hover:text-red-600 text-sm">×</button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input type="text" value={row.artist} onChange={(e) => updateScheduleRow(index, { artist: e.target.value })} placeholder="Artist" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <input type="text" value={row.stage} onChange={(e) => updateScheduleRow(index, { stage: e.target.value })} placeholder="Stage" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <input type="date" value={row.date} onChange={(e) => updateScheduleRow(index, { date: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <input type="time" value={row.startTime} onChange={(e) => updateScheduleRow(index, { startTime: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setScheduleRows((p) => [...p, { ...EMPTY_SCHEDULE }])} className="text-sm text-indigo-700 font-medium hover:underline">+ Add schedule row</button>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Paste details</h3>
              <p className="text-sm text-gray-600">Ticket email, hotel, or flight confirmations — we&apos;ll fill fields from parse.</p>
            </div>
            <textarea value={blobText} onChange={(e) => setBlobText(e.target.value)} rows={8} placeholder="Paste ticket email, hotel confirmation…" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono" />
            <button type="button" onClick={() => void handleParse()} disabled={parsing || blobText.trim().length < 20} className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50">
              {parsing ? 'Parsing…' : 'Parse with AI'}
            </button>
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

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Ingest concert trip</h1>
      <p className="text-sm text-gray-600 mb-6">
        Build the concert source object, then attach trip context — save when ready.
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
