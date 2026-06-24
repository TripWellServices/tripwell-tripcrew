'use client'

import type { ScheduleRow } from '@/app/components/planner/concert-wizard-steps'
import type { TripSetupFormState } from '@/app/components/trip/setup/trip-setup-wizard-steps'

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

type MusicEventStepProps = {
  form: TripSetupFormState
  onChange: (patch: Partial<TripSetupFormState>) => void
  onSave: () => Promise<void>
  saving: boolean
  error: string | null
  hasExistingConcert: boolean
}

export default function MusicEventStep({
  form,
  onChange,
  onSave,
  saving,
  error,
  hasExistingConcert,
}: MusicEventStepProps) {
  function updateScheduleRow(index: number, patch: Partial<ScheduleRow>) {
    onChange({
      scheduleRows: form.scheduleRows.map((row, i) =>
        i === index ? { ...row, ...patch } : row
      ),
    })
  }

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

      {!hasExistingConcert ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No concert linked yet — fill in the event and save to attach it to this trip.
        </p>
      ) : null}

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
          <span className="block text-sm font-medium text-gray-700 mb-1">Headliner / artist</span>
          <input
            type="text"
            value={form.concertArtist}
            onChange={(e) => onChange({ concertArtist: e.target.value })}
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
        Multi-day festival
      </label>

      <div className="border-t border-gray-100 pt-5">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Set schedule</h4>
        <p className="text-xs text-gray-500 mb-3">Stages, headliners, and day rows.</p>
        <ul className="space-y-3">
          {form.scheduleRows.map((row, index) => (
            <li
              key={index}
              className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50/50"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) => updateScheduleRow(index, { title: e.target.value })}
                  placeholder="Set / headliner"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={row.artist}
                  onChange={(e) => updateScheduleRow(index, { artist: e.target.value })}
                  placeholder="Artist"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={row.stage}
                  onChange={(e) => updateScheduleRow(index, { stage: e.target.value })}
                  placeholder="Stage"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateScheduleRow(index, { date: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="time"
                  value={row.startTime}
                  onChange={(e) => updateScheduleRow(index, { startTime: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            onChange({ scheduleRows: [...form.scheduleRows, { ...EMPTY_SCHEDULE }] })
          }
          className="mt-2 text-sm text-indigo-700 font-medium hover:underline"
        >
          + Add schedule row
        </button>
      </div>

      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving || !form.concertName.trim()}
        className="px-5 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save music event'}
      </button>
    </div>
  )
}
