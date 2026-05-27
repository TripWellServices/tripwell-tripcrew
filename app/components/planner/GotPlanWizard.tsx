'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { experiencePaths } from '@/lib/experience-routes'
import { LocalStorageAPI } from '@/lib/localStorage'
import type { ParsedTripPlan } from '@/lib/trip-plan-model'
import {
  classifyIngestPlan,
  ingestClassificationLabel,
} from '@/lib/trip-plan-ingest'
import { dateOnlyToNoonISO } from '@/lib/trip-plan-dates'

type WizardStep = 'whereWhat' | 'review'

function applyParsedToDraft(
  p: ParsedTripPlan,
  draft: {
    tripName: string
    whereText: string
    whatText: string
    city: string
    stateUS: string
    country: string
    startDate: string
    endDate: string
  }
) {
  return {
    tripName: p.tripName?.trim() || draft.tripName,
    whereText:
      [p.city, p.state, p.country].filter(Boolean).join(', ') ||
      p.whereFreeform?.trim() ||
      draft.whereText,
    whatText:
      p.eventAnchor?.name ||
      p.tripName?.trim() ||
      draft.whatText,
    city: p.city?.trim() || draft.city,
    stateUS: p.state?.trim() || draft.stateUS,
    country: p.country?.trim() || draft.country || 'Canada',
    startDate: p.startDate || draft.startDate,
    endDate: p.endDate || draft.endDate,
  }
}

export default function GotPlanWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paths = experiencePaths()
  const eventIntent = searchParams.get('intent') === 'event'

  const [step, setStep] = useState<WizardStep>('whereWhat')
  const [whereText, setWhereText] = useState('')
  const [whatText, setWhatText] = useState(eventIntent ? '' : '')
  const [blobText, setBlobText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importedPlan, setImportedPlan] = useState<ParsedTripPlan | null>(null)

  const [tripName, setTripName] = useState('')
  const [city, setCity] = useState('')
  const [stateUS, setStateUS] = useState('')
  const [country, setCountry] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (eventIntent && !whatText) {
      setWhatText('')
    }
  }, [eventIntent, whatText])

  const classification = useMemo(
    () => (importedPlan ? classifyIngestPlan(importedPlan) : null),
    [importedPlan]
  )

  async function handleParseAndContinue() {
    setError('')
    const combined = [blobText.trim(), whereText.trim(), whatText.trim()]
      .filter(Boolean)
      .join('\n\n')
    if (combined.length < 10 && !whereText.trim() && !whatText.trim()) {
      setError('Tell us where and what — or paste confirmations (at least 10 characters).')
      return
    }

    setParsing(true)
    try {
      let plan: ParsedTripPlan | null = null
      if (combined.length >= 20) {
        const res = await fetch('/api/plan/parse-blob', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blob: combined }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Parse failed')
        plan = data.parsed as ParsedTripPlan
      } else {
        plan = {
          tripName: whatText.trim() || null,
          startDate: null,
          endDate: null,
          city: whereText.split(',')[0]?.trim() || null,
          state: whereText.split(',')[1]?.trim() || null,
          country: null,
          whereFreeform: whereText.trim() || null,
          whoWith: null,
          transportMode: null,
          lodging: null,
          legs: [],
          notes: null,
          experiences: [],
          daySlots: [],
          eventAnchor: whatText.trim()
            ? {
                name: whatText.trim(),
                kind: 'festival',
                artist: null,
                venue: null,
                eventDate: null,
                ticketStatus: null,
                confirmationNotes: null,
              }
            : null,
          ingestType: whatText.trim() ? 'concert' : null,
        }
      }

      setImportedPlan(plan)
      const draft = applyParsedToDraft(plan!, {
        tripName,
        whereText,
        whatText,
        city,
        stateUS,
        country,
        startDate,
        endDate,
      })
      setTripName(draft.tripName)
      setWhereText(draft.whereText)
      setWhatText(draft.whatText)
      setCity(draft.city)
      setStateUS(draft.stateUS)
      setCountry(draft.country)
      setStartDate(draft.startDate)
      setEndDate(draft.endDate)
      setStep('review')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setParsing(false)
    }
  }

  async function handleCreateTrip() {
    setError('')
    const tid = LocalStorageAPI.getTravelerId()
    if (!tid) {
      setError('Sign in to create a trip.')
      return
    }
    if (!tripName.trim()) {
      setError('Enter a trip name.')
      return
    }
    if (!startDate || !endDate) {
      setError('Set start and end dates — we need them to build your trip days.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/traveler/trips/ingest-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelerId: tid,
          tripName: tripName.trim(),
          startDate: dateOnlyToNoonISO(startDate),
          endDate: dateOnlyToNoonISO(endDate),
          city: city.trim() || null,
          state: stateUS.trim() || null,
          country: country.trim() || null,
          whereFreeform: whereText.trim() || null,
          lodging: importedPlan?.lodging ?? null,
          legs: importedPlan?.legs ?? [],
          experiences: importedPlan?.experiences ?? [],
          daySlots: importedPlan?.daySlots ?? [],
          eventAnchor: importedPlan?.eventAnchor ?? null,
          notes: importedPlan?.notes?.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to create trip')
      const id = data.trip?.id || data.id
      if (!id) throw new Error('No trip id returned')
      router.push(`/trip/${id}?ingested=1`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href={paths.planFork}
        className="text-sm text-sky-600 hover:underline font-medium mb-6 inline-block"
      >
        ← Planner
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {eventIntent ? 'Plan around your event' : 'Already booked'}
      </h1>
      <p className="text-gray-600 text-sm mb-8">
        Start with where and what. Paste tickets, hotel, or flight confirmations — we&apos;ll attach
        them as first-class trip records. Invite people through TripCrew after your trip is created.
      </p>

      <div className="flex gap-2 mb-8">
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${
            step === 'whereWhat' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          1. Where &amp; what
        </span>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${
            step === 'review' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-400'
          }`}
        >
          2. Review &amp; create
        </span>
      </div>

      {error ? (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {error}
        </p>
      ) : null}

      {step === 'whereWhat' ? (
        <div className="space-y-5 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Where?</span>
            <input
              type="text"
              value={whereText}
              onChange={(e) => setWhereText(e.target.value)}
              placeholder="e.g. Montreal, QC"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">What?</span>
            <input
              type="text"
              value={whatText}
              onChange={(e) => setWhatText(e.target.value)}
              placeholder="e.g. Osheaga festival, Noah Kahan show"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </label>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Paste confirmations (optional)
            </span>
            <textarea
              value={blobText}
              onChange={(e) => setBlobText(e.target.value)}
              rows={6}
              placeholder="Ticket email, hotel confirmation, flight details…"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleParseAndContinue()}
            disabled={parsing}
            className="w-full px-4 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
          >
            {parsing ? 'Reading your plan…' : 'Continue — review'}
          </button>
        </div>
      ) : null}

      {step === 'review' ? (
        <div className="space-y-5">
          {classification ? (
            <p className="text-sm text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-4 py-3">
              Detected:{' '}
              <span className="font-semibold">{ingestClassificationLabel(classification)}</span>
              {importedPlan?.eventAnchor?.name ? (
                <>
                  {' '}
                  — anchor: <span className="font-medium">{importedPlan.eventAnchor.name}</span>
                </>
              ) : null}
            </p>
          ) : null}

          {importedPlan?.eventAnchor?.name ? (
            <div className="text-sm text-gray-700 bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 space-y-1">
              <p>
                Event:{' '}
                <span className="font-medium">{importedPlan.eventAnchor.name}</span>
                {importedPlan.eventAnchor.venue ? ` @ ${importedPlan.eventAnchor.venue}` : ''}
              </p>
              {importedPlan.eventAnchor.eventDate ? (
                <p>Event date: {importedPlan.eventAnchor.eventDate}</p>
              ) : null}
              {importedPlan.eventAnchor.ticketStatus ? (
                <p>Tickets: {importedPlan.eventAnchor.ticketStatus}</p>
              ) : null}
            </div>
          ) : null}

          {importedPlan?.lodging?.title ? (
            <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              Hotel: <span className="font-medium">{importedPlan.lodging.title}</span>
              {importedPlan.lodging.address ? ` · ${importedPlan.lodging.address}` : ''}
            </p>
          ) : null}

          {importedPlan?.daySlots?.length ? (
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="font-medium mb-2">Parsed schedule ({importedPlan.daySlots.length} items)</p>
              <ul className="space-y-1 text-xs">
                {importedPlan.daySlots.slice(0, 8).map((slot, i) => (
                  <li key={`${slot.title}-${i}`}>
                    {slot.slotDate ? slot.slotDate : slot.dayNumber ? `Day ${slot.dayNumber}` : 'Day ?'} —{' '}
                    {slot.title}
                  </li>
                ))}
                {importedPlan.daySlots.length > 8 ? (
                  <li className="text-gray-500">+ {importedPlan.daySlots.length - 8} more</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {importedPlan?.legs?.length ? (
            <p className="text-sm text-gray-600">
              Travel: {importedPlan.legs.length} leg{importedPlan.legs.length === 1 ? '' : 's'} detected
            </p>
          ) : null}

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Trip name</span>
              <input
                type="text"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">City</span>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">State / region</span>
                <input
                  type="text"
                  value={stateUS}
                  onChange={(e) => setStateUS(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Country</span>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">End date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </label>
            </div>
            {!startDate || !endDate ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Dates are required. Add them above before creating the trip.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setStep('whereWhat')}
              className="px-4 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void handleCreateTrip()}
              disabled={saving || !startDate || !endDate}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Creating trip…' : 'Create trip'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
