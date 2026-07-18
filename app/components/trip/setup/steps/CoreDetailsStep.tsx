'use client'

import { useState } from 'react'
import DestinationFields from '@/app/components/trip/setup/DestinationFields'
import type {
  TripSetupContextProps,
  TripSetupFormState,
} from '@/app/components/trip/setup/trip-setup-wizard-steps'
import { LocalStorageAPI } from '@/lib/localStorage'

type CoreDetailsStepProps = {
  form: TripSetupFormState
  setupContext: TripSetupContextProps
  onChange: (patch: Partial<TripSetupFormState>) => void
  error: string | null
  tripId: string
}

export default function CoreDetailsStep({
  form,
  setupContext,
  onChange,
  error,
  tripId,
}: CoreDetailsStepProps) {
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const showInferredHint =
    setupContext.isConcertTrip &&
    setupContext.inferredTitle &&
    !form.titleManuallyEdited

  async function generatePurpose() {
    setGenerateError(null)
    const travelerId = LocalStorageAPI.getTravelerId()
    if (!travelerId) {
      setGenerateError('Sign in to generate purpose text.')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch(`/api/trip/${tripId}/generate-purpose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelerId,
          context: {
            title: form.title,
            purpose: form.purpose,
            city: form.city,
            state: form.state,
            country: form.country,
            startDate: form.startDate,
            endDate: form.endDate,
            setupOrigin: setupContext.setupOrigin,
            concertName: setupContext.concertName,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      const patch: Partial<TripSetupFormState> = {}
      if (typeof data.purpose === 'string' && data.purpose.trim()) {
        patch.purpose = data.purpose.trim()
      }
      if (typeof data.title === 'string' && data.title.trim() && !form.titleManuallyEdited) {
        patch.title = data.title.trim()
      }
      if (Object.keys(patch).length) onChange(patch)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Core details</h3>
        <p className="text-sm text-gray-600">
          {setupContext.setupOrigin === 'CONCERT_INGEST'
            ? 'Review destination and dates for your concert trip — flights, stay, and essentials come next.'
            : setupContext.setupOrigin === 'GENERIC'
              ? 'Review the draft from ingest — edit title and purpose, then save when ready.'
              : 'Trip title, destination, and dates. Flights, stay, and essentials are on the next steps.'}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">
          Trip title <span className="text-red-500">*</span>
        </span>
        <input
          type="text"
          value={form.title}
          onChange={(e) =>
            onChange({ title: e.target.value, titleManuallyEdited: true })
          }
          placeholder={
            setupContext.inferredTitle ?? 'e.g. Osheaga Music Festival Trip to Montreal'
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        {showInferredHint ? (
          <span className="block text-xs text-gray-500 mt-1">
            Suggested from your event and destination — edit anytime.
          </span>
        ) : null}
      </label>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="block text-sm font-medium text-gray-700">Trip purpose</span>
          <button
            type="button"
            onClick={() => void generatePurpose()}
            disabled={generating}
            className="text-xs font-medium text-sky-700 hover:underline disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'AI generate'}
          </button>
        </div>
        <textarea
          value={form.purpose}
          onChange={(e) => onChange({ purpose: e.target.value })}
          rows={3}
          placeholder="e.g. Festival weekend with friends, centered around Osheaga, staying near downtown Montreal."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <span className="block text-xs text-gray-500 mt-1">
          Why you are going — separate from the display title.
        </span>
        {generateError ? (
          <p className="text-xs text-red-600 mt-1">{generateError}</p>
        ) : null}
      </div>

      <DestinationFields
        city={form.city}
        state={form.state}
        country={form.country}
        onChange={(patch) => onChange(patch)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Trip start <span className="text-red-500">*</span>
          </span>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Trip end <span className="text-red-500">*</span>
          </span>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>
      </div>
    </div>
  )
}
