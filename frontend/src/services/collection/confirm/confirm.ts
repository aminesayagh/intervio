import { useSyncExternalStore } from 'react'

/** A question the person answers before an action runs (spec 7.4, 7.6). */
export type Confirmation = {
  title: string
  text: string
  /** The confirming button's words. */
  button: string
  /** Cancel's words, when not "Cancel". */
  cancel?: string
  /** The confirming button is red: the action removes or loses something. */
  danger?: boolean
}

type Asked = Confirmation & { answer: (confirmed: boolean) => void }

let asked: Asked | null = null
const listeners = new Set<() => void>()
function show(next: Asked | null) {
  asked = next
  for (const listener of listeners) listener()
}

/**
 * Asks for a confirmation, shown by the collection's one `<Confirmations />` host:
 * true when confirmed, false when cancelled. A new question cancels the one showing.
 */
export function confirm(question: Confirmation): Promise<boolean> {
  asked?.answer(false)
  return new Promise((resolve) =>
    show({
      ...question,
      answer: (confirmed) => {
        show(null)
        resolve(confirmed)
      },
    }),
  )
}

/** The question showing, for the host. */
export function useAsked() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => asked,
  )
}
