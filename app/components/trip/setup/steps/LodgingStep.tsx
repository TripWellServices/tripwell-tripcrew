'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import LodgingPlacePicker, {
  type LodgingPlaceSelection,
} from '@/app/components/trip/LodgingPlacePicker'
import type { LodgingCardLodging } from '@/app/components/trip/LodgingCard'
import { LocalStorageAPI } from '@/lib/localStorage'
import {
  AutosaveStatusBar,
  useTripSetupAutosave,
} from '@/lib/trip/useTripSetupAutosave'
import {
  emptyLodgingRow,
  lodgingFormRowFromDb,
  lodgingRowHasData,
  nearbyDraftsFromJson,
  type LodgingFormRow,
  type NearbyAttractionDraft,
} from '@/lib/trip-lodging-parse'

type LodgingStepProps = {
  tripId: string
  lodging: LodgingCardLodging | null
  googleApiKey: string
  onLodgingSaved?: () => void
}

function selectionFromRow(row: LodgingFormRow, lodging: LodgingCardLodging | null): LodgingPlaceSelection | null {
  if (!lodgingRowHasData(row) && !lodging) return null
  return {
    title: row.title || lodging?.title || '',
    address: row.address || lodging?.address,
    streetAddress: row.streetAddress || lodging?.streetAddress,
    city: row.city || lodging?.city,
    state: row.state || lodging?.state,
    postalCode: row.postalCode || lodging?.postalCode,
    countryCode: row.countryCode || lodging?.countryCode,
    phone: row.phone || lodging?.phone,
    website: row.website || lodging?.website,
    googlePlaceId: row.googlePlaceId || lodging?.googlePlaceId,
    imageUrl: lodging?.imageUrl,
    rating: lodging?.rating,
    lat: lodging?.lat,
    lng: lodging?.lng,
    defaultCheckInTime: row.defaultCheckInTime || lodging?.defaultCheckInTime,
    defaultCheckOutTime: row.defaultCheckOutTime || lodging?.defaultCheckOutTime,
  }
}

function formatMoney(amount: number | null, currency: string): string {
  if (amount == null) return ''
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'USD',
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export default function LodgingStep({
  tripId,
  lodging,
  googleApiKey,
  onLodgingSaved,
}: LodgingStepProps) {
  const [row, setRow] = useState<LodgingFormRow>(() =>
    lodging ? lodgingFormRowFromDb(lodging) : emptyLodgingRow()
  )
  const [nearbyDrafts, setNearbyDrafts] = useState<NearbyAttractionDraft[]>(() =>
    nearbyDraftsFromJson(lodging?.nearbyAttractionDrafts)
  )
  const [selectedDraftKeys, setSelectedDraftKeys] = useState<Set<string>>(() =>
    new Set(nearbyDraftsFromJson(lodging?.nearbyAttractionDrafts).map((d) => d.draftKey))
  )
  const [enrichmentLodging, setEnrichmentLodging] = useState<LodgingCardLodging | null>(lodging)
  const [showGoogleEnrichment, setShowGoogleEnrichment] = useState(false)

  const [parseTab, setParseTab] = useState<'paste' | 'upload'>('paste')
  const [pasteText, setPasteText] = useState('')
  const [showPasteSource, setShowPasteSource] = useState(!lodgingRowHasData(row))
  const [parseBusy, setParseBusy] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parseSuccess, setParseSuccess] = useState<string | null>(null)
  const [buildBusy, setBuildBusy] = useState(false)
  const [buildMessage, setBuildMessage] = useState<string | null>(null)

  useEffect(() => {
    if (lodging) {
      setRow(lodgingFormRowFromDb(lodging))
      setEnrichmentLodging(lodging)
      const drafts = nearbyDraftsFromJson(lodging.nearbyAttractionDrafts)
      setNearbyDrafts(drafts)
      setSelectedDraftKeys(new Set(drafts.map((d) => d.draftKey)))
    }
  }, [lodging])

  function patchRow(patch: Partial<LodgingFormRow>) {
    setRow((prev) => ({ ...prev, ...patch }))
  }

  const persistLodging = useCallback(async () => {
    const travelerId = LocalStorageAPI.getTravelerId()
    if (!travelerId) throw new Error('Sign in to save changes to this trip.')
    if (!lodgingRowHasData(row)) return

    const res = await fetch(`/api/trip/${tripId}/lodging`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        travelerId,
        lodging: row,
        nearbyAttractionDrafts: nearbyDrafts,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save stay')
    onLodgingSaved?.()
  }, [nearbyDrafts, onLodgingSaved, row, tripId])

  const watchKey = useMemo(
    () => JSON.stringify({ row, nearbyDrafts }),
    [nearbyDrafts, row]
  )

  const lodgingAutosave = useTripSetupAutosave({
    enabled: lodgingRowHasData(row),
    watchKey,
    onSave: persistLodging,
    mode: 'debounced',
  })

  async function runParse(body: FormData | { text: string }) {
    setParseError(null)
    setParseSuccess(null)
    const travelerId = LocalStorageAPI.getTravelerId()
    if (!travelerId) {
      setParseError('Sign in to parse confirmations.')
      return
    }

    setParseBusy(true)
    try {
      let res: Response
      if (body instanceof FormData) {
        body.set('travelerId', travelerId)
        res = await fetch(`/api/trip/${tripId}/lodging/parse`, {
          method: 'POST',
          body,
        })
      } else {
        res = await fetch(`/api/trip/${tripId}/lodging/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ travelerId, text: body.text }),
        })
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Parse failed')
      }

      const parsedRow = data.lodging as LodgingFormRow | undefined
      if (!parsedRow || !lodgingRowHasData(parsedRow)) {
        throw new Error('No lodging details found — try a clearer paste or photo.')
      }

      setRow((prev) => ({ ...prev, ...parsedRow }))
      const drafts = Array.isArray(data.nearbyAttractionDrafts)
        ? nearbyDraftsFromJson(data.nearbyAttractionDrafts)
        : []
      if (drafts.length) {
        setNearbyDrafts(drafts)
        setSelectedDraftKeys(new Set(drafts.map((d) => d.draftKey)))
      }

      setPasteText('')
      setShowPasteSource(false)
      const summary = [
        parsedRow.title,
        parsedRow.confirmationNumber ? `conf ${parsedRow.confirmationNumber}` : null,
        parsedRow.nights != null ? `${parsedRow.nights} nights` : null,
      ]
        .filter(Boolean)
        .join(' · ')
      setParseSuccess(`Parsed into fields — autosaving. ${summary}`)
      await lodgingAutosave.saveNow()
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setParseBusy(false)
    }
  }

  async function buildAttractions() {
    setBuildMessage(null)
    const travelerId = LocalStorageAPI.getTravelerId()
    if (!travelerId) {
      setBuildMessage('Sign in to build attractions.')
      return
    }

    setBuildBusy(true)
    try {
      await lodgingAutosave.saveNow()
      const res = await fetch(`/api/trip/${tripId}/lodging/build-attractions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelerId,
          draftKeys: Array.from(selectedDraftKeys),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Build failed')
      }
      const created = Array.isArray(data.created) ? data.created.length : 0
      const skipped = Array.isArray(data.skipped) ? data.skipped.length : 0
      setBuildMessage(
        created
          ? `Added ${created} attraction${created === 1 ? '' : 's'} to your trip saved list${skipped ? ` (${skipped} skipped as duplicates)` : ''}.`
          : skipped
            ? 'All selected activities were already on your trip.'
            : 'No activities were added.'
      )
    } catch (err) {
      setBuildMessage(err instanceof Error ? err.message : 'Build failed')
    } finally {
      setBuildBusy(false)
    }
  }

  function handleGoogleHydrated(hydrated: LodgingCardLodging) {
    setEnrichmentLodging(hydrated)
    patchRow({
      title: hydrated.title || row.title,
      address: hydrated.address ?? row.address,
      streetAddress: hydrated.streetAddress ?? row.streetAddress,
      city: hydrated.city ?? row.city,
      state: hydrated.state ?? row.state,
      postalCode: hydrated.postalCode ?? row.postalCode,
      countryCode: hydrated.countryCode ?? row.countryCode,
      phone: hydrated.phone ?? row.phone,
      website: hydrated.website ?? row.website,
      googlePlaceId: hydrated.googlePlaceId ?? row.googlePlaceId,
      defaultCheckInTime: hydrated.defaultCheckInTime ?? row.defaultCheckInTime,
      defaultCheckOutTime: hydrated.defaultCheckOutTime ?? row.defaultCheckOutTime,
    })
    setShowGoogleEnrichment(false)
    void lodgingAutosave.saveNow()
  }

  const googleSelection = selectionFromRow(row, enrichmentLodging)

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Stay</h3>
        <p className="text-sm text-gray-600">
          Paste your hotel confirmation to capture booking details, then optionally enrich the
          property with Google for address, phone, and map location.
        </p>
      </div>

      <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Paste or upload confirmation</h4>
            <p className="text-xs text-gray-600 mt-0.5">
              Expedia, Hyatt, Airbnb, or screenshot — parsed results fill the fields below.
            </p>
          </div>
          {!showPasteSource ? (
            <button
              type="button"
              onClick={() => setShowPasteSource(true)}
              className="text-xs text-sky-700 font-medium hover:underline shrink-0"
            >
              Edit source
            </button>
          ) : null}
        </div>

        {showPasteSource ? (
          <>
            <div className="flex gap-2 border-b border-sky-100 pb-2">
              <button
                type="button"
                onClick={() => setParseTab('paste')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  parseTab === 'paste'
                    ? 'bg-white text-sky-800 border border-sky-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Paste text
              </button>
              <button
                type="button"
                onClick={() => setParseTab('upload')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  parseTab === 'upload'
                    ? 'bg-white text-sky-800 border border-sky-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Upload photo
              </button>
            </div>

            {parseTab === 'paste' ? (
              <div className="space-y-2">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={5}
                  placeholder="Paste your Expedia or hotel confirmation…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={() => void runParse({ text: pasteText })}
                  disabled={parseBusy || pasteText.trim().length < 10}
                  className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50"
                >
                  {parseBusy ? 'Parsing…' : 'Parse stay'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const form = new FormData()
                    form.set('file', file)
                    if (pasteText.trim()) form.set('text', pasteText.trim())
                    void runParse(form)
                    e.target.value = ''
                  }}
                  disabled={parseBusy}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-white file:text-sky-800 file:font-medium"
                />
                {parseBusy ? <p className="text-xs text-gray-500">Parsing screenshot…</p> : null}
              </div>
            )}
          </>
        ) : null}

        {parseError ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {parseError}
          </p>
        ) : null}
        {parseSuccess ? (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {parseSuccess}
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Booking details</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="block text-xs font-medium text-gray-600 mb-1">Property name</span>
            <input
              type="text"
              value={row.title}
              onChange={(e) => patchRow({ title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Booking provider</span>
            <input
              type="text"
              value={row.bookingProvider}
              onChange={(e) => patchRow({ bookingProvider: e.target.value })}
              placeholder="Expedia"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Confirmation number</span>
            <input
              type="text"
              value={row.confirmationNumber}
              onChange={(e) => patchRow({ confirmationNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="block text-xs font-medium text-gray-600 mb-1">Provider itinerary</span>
            <input
              type="text"
              value={row.providerItineraryNumber}
              onChange={(e) => patchRow({ providerItineraryNumber: e.target.value })}
              placeholder="Expedia itinerary number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Nights</span>
            <input
              type="number"
              min={0}
              value={row.nights ?? ''}
              onChange={(e) =>
                patchRow({ nights: e.target.value ? Number.parseInt(e.target.value, 10) : null })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Rooms</span>
            <input
              type="number"
              min={0}
              value={row.roomCount ?? ''}
              onChange={(e) =>
                patchRow({
                  roomCount: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Adults</span>
            <input
              type="number"
              min={0}
              value={row.adultCount ?? ''}
              onChange={(e) =>
                patchRow({
                  adultCount: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Children</span>
            <input
              type="number"
              min={0}
              value={row.childCount ?? ''}
              onChange={(e) =>
                patchRow({
                  childCount: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="block text-xs font-medium text-gray-600 mb-1">Room type</span>
            <input
              type="text"
              value={row.roomType}
              onChange={(e) => patchRow({ roomType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Check-in</span>
            <input
              type="text"
              value={row.defaultCheckInTime}
              onChange={(e) => patchRow({ defaultCheckInTime: e.target.value })}
              placeholder="3:00 PM"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Check-out</span>
            <input
              type="text"
              value={row.defaultCheckOutTime}
              onChange={(e) => patchRow({ defaultCheckOutTime: e.target.value })}
              placeholder="11:00 AM"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Nightly rate</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={row.nightlyRate ?? ''}
              onChange={(e) =>
                patchRow({
                  nightlyRate: e.target.value ? Number.parseFloat(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Total cost</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={row.totalCost ?? ''}
              onChange={(e) =>
                patchRow({
                  totalCost: e.target.value ? Number.parseFloat(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Currency</span>
            <input
              type="text"
              value={row.currency}
              onChange={(e) => patchRow({ currency: e.target.value.toUpperCase() })}
              maxLength={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={row.breakfastIncluded === true}
              onChange={(e) =>
                patchRow({ breakfastIncluded: e.target.checked ? true : null })
              }
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Breakfast included</span>
          </label>

          <label className="block sm:col-span-2">
            <span className="block text-xs font-medium text-gray-600 mb-1">Booking notes</span>
            <textarea
              value={row.bookingNotes}
              onChange={(e) => patchRow({ bookingNotes: e.target.value })}
              rows={2}
              placeholder="Nonsmoking, rewards, special requests…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            />
          </label>

          {row.totalCost != null ? (
            <p className="sm:col-span-2 text-xs text-gray-600">
              Total: {formatMoney(row.totalCost, row.currency)}
            </p>
          ) : null}
        </div>
      </div>

      {nearbyDrafts.length > 0 ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-4 space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Nearby suggestions from Expedia</h4>
            <p className="text-xs text-gray-600 mt-0.5">
              Review parsed activities — selected items are saved to your trip list when you build
              attractions (not scheduled until Itinerary).
            </p>
          </div>
          <ul className="space-y-2">
            {nearbyDrafts.map((draft) => (
              <li
                key={draft.draftKey}
                className="flex items-start gap-3 rounded-lg border border-violet-100 bg-white px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={selectedDraftKeys.has(draft.draftKey)}
                  onChange={(e) => {
                    setSelectedDraftKeys((prev) => {
                      const next = new Set(prev)
                      if (e.target.checked) next.add(draft.draftKey)
                      else next.delete(draft.draftKey)
                      return next
                    })
                  }}
                  className="mt-1 rounded border-gray-300"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{draft.title}</p>
                  <p className="text-xs text-gray-500">
                    {draft.rating != null ? `${draft.rating} / 5 · ` : ''}
                    {draft.source.replace(/_/g, ' ')}
                    {draft.priceText ? ` · ${draft.priceText}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void buildAttractions()}
            disabled={buildBusy || selectedDraftKeys.size === 0}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            {buildBusy ? 'Building…' : 'Build attractions from nearby POI'}
          </button>
          {buildMessage ? (
            <p className="text-sm text-gray-700 bg-white border border-violet-100 rounded-lg px-3 py-2">
              {buildMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Find property on Google</h4>
            <p className="text-xs text-gray-600 mt-0.5">
              Optional — adds address, phone, rating, and map pin without replacing booking fields.
            </p>
          </div>
          {!showGoogleEnrichment && googleSelection ? (
            <button
              type="button"
              onClick={() => setShowGoogleEnrichment(true)}
              className="text-xs text-blue-700 font-medium hover:underline shrink-0"
            >
              Change property
            </button>
          ) : null}
        </div>

        {showGoogleEnrichment || !googleSelection ? (
          <LodgingPlacePicker
            googleApiKey={googleApiKey}
            value={googleSelection}
            onChange={() => {}}
            tripId={tripId}
            compact
            onHydrated={handleGoogleHydrated}
          />
        ) : googleSelection ? (
          <div className="text-sm text-gray-700 space-y-1">
            {enrichmentLodging?.imageUrl ? (
              <img
                src={enrichmentLodging.imageUrl}
                alt={googleSelection.title}
                className="w-full h-32 object-cover rounded-lg mb-2"
              />
            ) : null}
            <p className="font-medium text-gray-900">{googleSelection.title}</p>
            {googleSelection.address ? <p>{googleSelection.address}</p> : null}
            {googleSelection.rating != null ? (
              <p className="text-gray-600">★ {googleSelection.rating.toFixed(1)}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <AutosaveStatusBar
        status={lodgingAutosave.status}
        errorMessage={lodgingAutosave.errorMessage}
        onRetry={() => void lodgingAutosave.saveNow()}
        hint={lodgingRowHasData(row) ? undefined : 'Add a property name to enable autosave.'}
      />
    </div>
  )
}
