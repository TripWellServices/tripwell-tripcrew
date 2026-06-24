'use client'

import type { TripSetupFormState } from '@/app/components/trip/setup/trip-setup-wizard-steps'

type CoreDetailsStepProps = {
  form: TripSetupFormState
  onChange: (patch: Partial<TripSetupFormState>) => void
  onSave: () => Promise<void>
  saving: boolean
  error: string | null
}

export default function CoreDetailsStep({
  form,
  onChange,
  onSave,
  saving,
  error,
}: CoreDetailsStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Core details</h3>
        <p className="text-sm text-gray-600">
          Name your trip, set destination and travel dates, then choose whether this trip
          includes a music festival or concert.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">
          Trip name / purpose <span className="text-red-500">*</span>
        </span>
        <input
          type="text"
          value={form.purpose}
          onChange={(e) => onChange({ purpose: e.target.value })}
          placeholder="e.g. Osheaga Music Festival"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-1">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={form.city}
            onChange={(e) => onChange({ city: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">State / region</span>
          <input
            type="text"
            value={form.state}
            onChange={(e) => onChange({ state: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Country</span>
          <input
            type="text"
            value={form.country}
            onChange={(e) => onChange({ country: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Who</span>
          <select
            value={form.whoWith}
            onChange={(e) => onChange({ whoWith: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
          >
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
          <select
            value={form.transportMode}
            onChange={(e) => onChange({ transportMode: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="">—</option>
            <option value="PLANE">Plane</option>
            <option value="CAR">Car</option>
            <option value="BOAT">Boat</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Starting from</span>
        <input
          type="text"
          value={form.startingLocation}
          onChange={(e) => onChange({ startingLocation: e.target.value })}
          placeholder="Home airport or city"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </label>

      <label className="flex items-start gap-3 p-4 rounded-lg border border-indigo-100 bg-indigo-50/50 cursor-pointer">
        <input
          type="checkbox"
          checked={form.includesMusicEvent}
          onChange={(e) => onChange({ includesMusicEvent: e.target.checked })}
          className="mt-1 rounded border-gray-300"
        />
        <span>
          <span className="block text-sm font-medium text-gray-900">
            This trip includes a music festival or concert
          </span>
          <span className="block text-xs text-gray-600 mt-0.5">
            Opens a dedicated step for event name, venue, and set schedule (e.g. Osheaga).
          </span>
        </span>
      </label>

      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving}
        className="px-5 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save core details'}
      </button>
    </div>
  )
}
