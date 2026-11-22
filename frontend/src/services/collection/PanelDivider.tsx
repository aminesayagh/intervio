import { useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../ui-kit'
import { PANEL } from './layout'

/**
 * The divider between the list and the panel (spec 9.1): drag it, or focus it and use
 * ← → (16 px), Home and End (the limits), Enter or a double-click (back to 560 px).
 * `onChange` follows the drag; `onCommit` is called once it ends, to save the width.
 */
export function PanelDivider({
  width,
  min,
  max,
  label,
  onChange,
  onCommit,
}: {
  width: number
  min: number
  max: number
  label: string
  onChange: (width: number) => void
  onCommit: (width: number) => void
}) {
  const drag = useRef<{ x: number; width: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const clamp = (value: number) => Math.min(Math.max(value, min), max)
  const set = (value: number) => {
    onChange(clamp(value))
    onCommit(clamp(value))
  }

  function onKeyDown(event: KeyboardEvent) {
    const next = {
      ArrowLeft: width + PANEL.step, // the panel is on the right: left widens it
      ArrowRight: width - PANEL.step,
      Home: min,
      End: max,
      Enter: PANEL.default,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    set(next)
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onDoubleClick={() => set(PANEL.default)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId)
        drag.current = { x: event.clientX, width }
        setDragging(true)
      }}
      onPointerMove={(event) => {
        if (drag.current)
          onChange(clamp(drag.current.width + drag.current.x - event.clientX))
      }}
      onPointerUp={() => {
        if (!drag.current) return
        drag.current = null
        setDragging(false)
        onCommit(width)
      }}
      className="group relative -me-1 w-2 shrink-0 cursor-col-resize touch-none outline-none"
    >
      <span
        className={cn(
          'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:w-0.5 group-hover:bg-foreground group-focus-visible:w-0.5 group-focus-visible:bg-foreground',
          dragging && 'w-0.5 bg-foreground',
        )}
      />
    </div>
  )
}
