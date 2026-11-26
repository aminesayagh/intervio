import { createContext, useContext } from 'react'

/**
 * What the description sends with each question (decision 153): the text and the
 * selection as Markdown; no selection means new text is wanted.
 */
export type DescriptionContext = {
  document: string
  selection: string | null
  toolName: 'edit' | 'generate'
}

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
