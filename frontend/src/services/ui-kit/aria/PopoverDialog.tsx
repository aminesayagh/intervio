import type { ReactElement, ReactNode } from 'react'
import { Dialog, DialogTrigger, Popover } from 'react-aria-components'

/**
 * A button that opens a small panel under it (React Aria's DialogTrigger, Popover and
 * Dialog): the focus moves into it, Escape or a click outside closes it.
 */
export function PopoverDialog({
  trigger,
  label,
  children,
}: {
  /** The button that opens it (a ui-kit Button). */
  trigger: ReactElement
  /** The panel's name, for assistive technologies. */
  label: string
  children: ReactNode
}) {
  return (
    <DialogTrigger>
      {trigger}
      <Popover
        placement="bottom start"
        offset={4}
        className="w-[300px] max-w-[calc(100vw-32px)] rounded-[var(--field-radius)] border border-border bg-surface p-3 text-sm shadow-md outline-none"
      >
        <Dialog aria-label={label} className="flex flex-col gap-4 outline-none">
          {children}
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}
