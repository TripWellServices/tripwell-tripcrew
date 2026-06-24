'use client'

import type { TripSetupFormState } from '@/app/components/trip/setup/trip-setup-wizard-steps'

type LogisticItem = {
  id: string
  title: string
  detail?: string | null
  isComplete: boolean
}

type FlightInfoStepProps = {
  form: TripSetupFormState
  items: LogisticItem[]
  onChange: (patch: Partial<TripSetupFormState>) => void
  onSave: () => Promise<void>
  saving: boolean
  error: string | null
}

export default function FlightInfoStep({
  form,
  items,
  onChange,
  onSave,
  saving,
  error,
}: FlightInfoStepProps) {
  const otherItems = items.filter(
    (i) =>
      !/^(outbound flight|return flight)$/i.test(i.title.trim())
  )

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Flight & travel</h3>
        <p className="text-sm text-gray-600">
          Capture your flights and transfers so they are easy to find during the trip.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Outbound flight</span>
        <input
          type="text"
          value={form.flightOutbound}
          onChange={(e) => onChange({ flightOutbound: e.target.value })}
          placeholder="e.g. AA 1234 · BOS → YUL · Jul 31 8:00am"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Return flight</span>
        <input
          type="text"
          value={form.flightReturn}
          onChange={(e) => onChange({ flightReturn: e.target.value })}
          placeholder="e.g. AA 5678 · YUL → BOS · Aug 2 4:30pm"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">
          Other travel notes
        </span>
        <textarea
          value={form.flightNotes}
          onChange={(e) => onChange({ flightNotes: e.target.value })}
          rows={3}
          placeholder="Airport transfer, rental car pickup, train, etc."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>

      {otherItems.length > 0 ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Saved logistics
          </p>
          <ul className="space-y-1 text-sm text-gray-700">
            {otherItems.map((item) => (
              <li key={item.id}>
                {item.title}
                {item.detail ? ` — ${item.detail}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving}
        className="px-5 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save travel info'}
      </button>
    </div>
  )
}
