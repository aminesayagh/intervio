import { createContext, useContext } from 'react'

export type AI = {
  ask: (prompt: string) => void
  /** Opens the requests under this element (a line of the text): "/" then AI. */
  request: (at: Element) => void
  proposal: string
  busy: boolean
  accept: () => void
  reject: () => void
}
export const AIContext = createContext<AI | null>(null)

/** The description's AI, where there is one (the "/" menu offers it then). */
export const useOptionalAI = () => useContext(AIContext)
