import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { clampPanel, openingWidth, PANEL } from './layout'

/**
 * The panel's width (spec 9.1): the room for the list and the panel (measured on
 * `sectionRef`), the width dragged during this opening, and the saved one each
 * opening starts from, in its reasonable range. `remeasure` changes when the
 * section is drawn again (the full page and back).
 */
export function usePanelWidth(key: string, shown: boolean, remeasure: unknown) {
  const sectionRef = useRef<HTMLElement>(null)
  const [space, setSpace] = useState(0)
  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const measure = () => setSpace(section.getBoundingClientRect().width)
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(section)
    return () => observer.disconnect()
  }, [remeasure])
  const widthKey = `intervio.collection.${key}.panelWidth`
  const [dragged, setDragged] = useState<number | null>(null)
  // Each opening starts from the saved width.
  const [wasShown, setWasShown] = useState(shown)
  if (wasShown !== shown) {
    setWasShown(shown)
    if (!shown) setDragged(null)
  }
  const saved = (() => {
    try {
      return Number(localStorage.getItem(widthKey)) || PANEL.default
    } catch {
      return PANEL.default
    }
  })()
  const width = space
    ? clampPanel(dragged ?? openingWidth(saved, space), space)
    : PANEL.default
  const commit = useCallback(
    (next: number) => {
      try {
        localStorage.setItem(widthKey, String(Math.round(next)))
      } catch {
        // not remembered: the next panel opens at 560 px
      }
    },
    [widthKey],
  )
  return { sectionRef, space, width, setDragged, commit }
}
