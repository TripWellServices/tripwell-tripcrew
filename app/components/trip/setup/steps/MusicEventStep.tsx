'use client'

import type { TripSetupContextProps, TripSetupFormState } from '@/app/components/trip/setup/trip-setup-wizard-steps'
import type { LineupRow } from '@/app/components/trip/setup/trip-setup-wizard-steps'
import { emptyLineupRow } from '@/lib/concert-lineup'

const EMPTY_LINEUP = emptyLineupRow()

type MusicEventStepProps = {
  form: TripSetupFormState
  setupContext: TripSetupContextProps
  onChange: (patch: Partial<TripSetupFormState>) => void
  error: string | null
}

export default function MusicEventStep({
  form,
  setupContext,
  onChange,
  error,
}: MusicEventStepProps) {
  function updateLineupRow(index: number, patch: Partial<LineupRow>) {
    onChange({
      scheduleRows: form.scheduleRows.map((row, i) =>
        i === index ? { ...row, ...patch } : row
      ),
    })
  }

  const linked = Boolean(setupContext.concertId)

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Music festival / concert</h3>
        <p className="text-sm text-gray-600">
          Event details for the show you are traveling for — separate from general trip dates.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      ) : null}

      {linked ? (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          Editing {form.concertName.trim() || setupContext.concertName} — linked to this trip.
        </p>
      ) : (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Save to create the event and link it to this trip.
        </p>
      )}

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">
          Event name <span className="text-red-500">*</span>
        </span>
        <input
          type="text"
          value={form.concertName}
          onChange={(e) => onChange({ concertName: e.target.value })}
          placeholder="e.g. Osheaga Music Festival"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Main headliner</span>
          <input
            type="text"
            value={form.concertArtist}
            onChange={(e) => onChange({ concertArtist: e.target.value })}
            placeholder="Primary artist, if one"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Venue</span>
          <input
            type="text"
            value={form.concertVenue}
            onChange={(e) => onChange({ concertVenue: e.target.value })}
            placeholder="e.g. Parc Jean-Drapeau"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Event URL</span>
        <input
          type="url"
          value={form.concertUrl}
          onChange={(e) => onChange({ concertUrl: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">Notes / ticket copy</span>
        <textarea
          value={form.concertDescription}
          onChange={(e) => onChange({ concertDescription: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Event start date</span>
          <input
            type="date"
            value={form.eventStartDate}
            onChange={(e) => onChange({ eventStartDate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Event start time</span>
          <input
            type="time"
            value={form.eventStartTime}
            onChange={(e) => onChange({ eventStartTime: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Event end date</span>
          <input
            type="date"
            value={form.eventEndDate}
            onChange={(e) => onChange({ eventEndDate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Event end time</span>
          <input
            type="time"
            value={form.eventEndTime}
            onChange={(e) => onChange({ eventEndTime: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={form.isFestival}
          onChange={(e) => onChange({ isFestival: e.target.checked })}
          className="rounded border-gray-300"
        />
        Festival / multi-day event
      </label>

      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Festival lineup</h4>
        <p className="text-xs text-gray-500 mb-3">
          Day number is relative to event start date — day 1, time, headliner.
        </p>
        <ul className="space-y-3">
          {form.scheduleRows.map((row, index) => (
            <li
              key={index}
              className="border border-gray-100 rounded-lg p-3 bg-gray-50/50"
            >
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
                {form.scheduleRows.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        scheduleRows: form.scheduleRows.filter((_, i) => i !== index),
                      })
                    }
                    className="px-2 text-gray-500 hover:text-red-600"
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
          onClick={() =>
            onChange({ scheduleRows: [...form.scheduleRows, { ...EMPTY_LINEUP }] })
          }
          className="mt-2 text-sm text-indigo-700 font-medium hover:underline"
        >
          + Add headliner
        </button>
      </div>
    </div>
  )
}
