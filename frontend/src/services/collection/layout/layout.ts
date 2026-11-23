import { useSyncExternalStore } from 'react'

export type LayoutMode = 'wide' | 'medium' | 'narrow'

function useMedia(query: string) {
  return useSyncExternalStore(
    (listener) => {
      const list = window.matchMedia?.(query)
      list?.addEventListener('change', listener)
      return () => list?.removeEventListener('change', listener)
    },
    // No matchMedia (some test setups): the widest layout.
    () => window.matchMedia?.(query).matches ?? true,
  )
}

/** The layout for the screen's width (spec 9). */
export function useLayoutMode(): LayoutMode {
  const wide = useMedia('(min-width: 1440px)')
  const medium = useMedia('(min-width: 1024px)')
  return wide ? 'wide' : medium ? 'medium' : 'narrow'
}

/** Panel widths (spec 9.1), in px. */
export const PANEL = {
  min: 400,
  listMin: 400,
  default: 560,
  step: 16,
  savedMax: 720,
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max))

/** What a drag allows: the panel at least 400 px, the list keeps at least 400 px. */
export const panelLimits = (space: number) => ({
  min: PANEL.min,
  max: Math.max(PANEL.min, space - PANEL.listMin),
})

/** A width within the drag limits. */
export const clampPanel = (width: number, space: number) => {
  const { min, max } = panelLimits(space)
  return clamp(width, min, max)
}

/** A saved width as the next panel opens with it: 400 px up to min(720 px, 60%). */
export const openingWidth = (saved: number, space: number) =>
  clampPanel(
    clamp(saved, PANEL.min, Math.min(PANEL.savedMax, space * 0.6)),
    space,
  )

/** A table column's width when its definition gives none (spec 9). */
export const COLUMN_WIDTH = 200

/**
 * A row's height in px: a table row, and a narrow screen's row (its name and the line
 * under it). Every row is one height, so the list counts positions (spec 8.4).
 */
export const ROW_HEIGHT = { table: 43, rows: 57 }
