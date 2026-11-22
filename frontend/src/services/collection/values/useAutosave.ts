import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed'

/** The delay between the last key typed and the save (spec 7.6). */
export const AUTOSAVE_DELAY = 1000

/**
 * Saves text a moment after the last change (spec 7.6): one save at a time, the latest
 * text always wins, a failure keeps the text for Retry. `flush` saves at once (the
 * field loses focus); leaving saves what is pending.
 */
export function useAutosave(save: (text: string) => Promise<void>) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const pending = useRef<string | null>(null)
  const running = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  }, [save])

  const flush = useCallback(async function run(): Promise<void> {
    clearTimeout(timer.current)
    if (running.current || pending.current === null) return
    const text = pending.current
    pending.current = null
    running.current = true
    setStatus('saving')
    try {
      await saveRef.current(text)
      setStatus(pending.current === null ? 'saved' : 'saving')
    } catch {
      pending.current ??= text // keep it for Retry, unless newer text came
      setStatus('failed')
      return
    } finally {
      running.current = false
    }
    if (pending.current !== null) void run() // typed while saving: save the latest
  }, [])

  const change = useCallback(
    (text: string) => {
      pending.current = text
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY)
    },
    [flush],
  )

  // Leaving (the editor or the panel closes) saves what is pending.
  useEffect(() => () => void flush(), [flush])

  return { status, change, flush, retry: flush }
}
