'use client'

import DestinationFields from '@/app/components/trip/setup/DestinationFields'
import type {
  TripSetupContextProps,
  TripSetupFormState,
} from '@/app/components/trip/setup/trip-setup-wizard-steps'

type CoreDetailsStepProps = {
  form: TripSetupFormState
  setupContext: TripSetupContextProps
  onChange: (patch: Partial<TripSetupFormState>) => void
  error: string | null
}

export default function CoreDetailsStep({
  form,
  setupContext,
  onChange,
  error,
}: CoreDetailsStepProps) {
  const showInferredHint =
    setupContext.isConcertTrip &&
    setupContext.inferredTitle &&
    !form.titleManuallyEdited

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Core details</h3>
        <p className="text-sm text-gray-600">
          {setupContext.setupOrigin === 'CONCERT_INGEST'
            ? 'Finish destination and dates for your concert trip — flights, stay, and things to do come next.'
            : 'Trip title, destination, and dates. Flights, stay, and things to do are on the next steps.'}
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

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Trip purpose</span>
        <textarea
          value={form.purpose}
          onChange={(e) => onChange({ purpose: e.target.value })}
          rows={3}
          placeholder="e.g. Attending the festival with friends"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <span className="block text-xs text-gray-500 mt-1">
          Why you are going — separate from the display title.
        </span>
      </label>

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
