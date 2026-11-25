import type { ReactElement, ReactNode, RefObject } from 'react'
import { Dialog, DialogTrigger, Popover } from 'react-aria-components'

/**
 * A button that opens a small panel under it (React Aria's DialogTrigger, Popover and
 * Dialog): the focus moves into it, Escape or a click outside closes it. Without a
 * button, `at` opens it under a spot of the page (a line of text) until `onClose`.
 */
export function PopoverDialog({
  trigger,
  at,
  label,
  width = 300,
  placement = 'bottom start',
  children,
}: {
  /** The button that opens it (a ui-kit Button). */
  trigger?: ReactElement
  /** Instead of a button: open under this element, closed through `onClose`. */
  at?: { anchor: RefObject<Element | null>; onClose: () => void }
  /** The panel's name, for assistive technologies. */
  label: string
  /** Its width in px (narrower on a small screen). */
  width?: number
  placement?: 'bottom start' | 'bottom end'
  /** Its content, or a function given `close`, to close it after a choice. */
  children: ReactNode | ((close: () => void) => ReactNode)
}) {
  const popover = (
    <Popover
      placement={placement}
      offset={4}
      style={{ width }}
      {...(at && {
        triggerRef: at.anchor,
        isOpen: true,
        onOpenChange: (open: boolean) => open || at.onClose(),
      })}
      // ponytail: Plate's floating toolbar ignores clicks in this class, so a
      // popover opened from it keeps it open; no other effect.
      className="ignore-click-outside/toolbar max-w-[calc(100vw-32px)] rounded-[var(--field-radius)] border border-border bg-surface p-3 text-sm shadow-md outline-none"
    >
      <Dialog aria-label={label} className="flex flex-col gap-4 outline-none">
        {({ close }) =>
          typeof children === 'function' ? children(close) : children
        }
      </Dialog>
    </Popover>
  )
  if (!trigger) return popover
  return (
    <DialogTrigger>
      {trigger}
      {popover}
    </DialogTrigger>
  )
}
