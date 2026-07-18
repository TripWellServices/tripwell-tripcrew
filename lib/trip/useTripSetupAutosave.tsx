'use client'

import { useEffect, useRef, useState } from 'react'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type UseTripSetupAutosaveOptions = {
  enabled: boolean
  debounceMs?: number
  onSave: () => Promise<void>
  /** Serialized snapshot of fields that trigger save */
  watchKey: string
  /** When manual, only saveNow() persists — no debounced effect */
  mode?: 'debounced' | 'manual'
}

export function useTripSetupAutosave({
  enabled,
  debounceMs = 800,
  onSave,
  watchKey,
  mode = 'debounced',
}: UseTripSetupAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const skipNext = useRef(true)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  useEffect(() => {
    if (!enabled || mode === 'manual') return
    if (skipNext.current) {
      skipNext.current = false
      return
    }

    setStatus('idle')
    const timer = setTimeout(() => {
      setStatus('saving')
      setErrorMessage(null)
      void onSaveRef
        .current()
        .then(() => setStatus('saved'))
        .catch((err: unknown) => {
          setStatus('error')
          setErrorMessage(err instanceof Error ? err.message : 'Save failed')
        })
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [enabled, debounceMs, mode, watchKey])

  async function saveNow() {
    setStatus('saving')
    setErrorMessage(null)
    try {
      await onSaveRef.current()
      setStatus('saved')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Save failed')
      throw err
    }
  }

  return { status, errorMessage, saveNow }
}

export function AutosaveStatusBar({
  status,
  errorMessage,
  onRetry,
  hint,
}: {
  status: AutosaveStatus
  errorMessage: string | null
  onRetry?: () => void
  hint?: string
}) {
  if (status === 'idle' && !hint) return null

  return (
    <div
      className={`mt-4 flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
        status === 'error'
          ? 'border-red-200 bg-red-50 text-red-800'
          : status === 'saved'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-gray-200 bg-gray-50 text-gray-600'
      }`}
    >
      <span>
        {status === 'idle' && hint}
        {status === 'saving' && 'Saving…'}
        {status === 'saved' && 'Saved'}
        {status === 'error' && (errorMessage || 'Could not save')}
      </span>
      {status === 'error' && onRetry ? (
        <button
          type="button"
          onClick={() => void onRetry()}
          className="text-sm font-medium underline"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}
