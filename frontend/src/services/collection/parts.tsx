import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, cn, Show } from '../ui-kit'

/** Pieces of the collection itself, built from the ui-kit's React Aria components. */

/**
 * How a panel closes: × at the end of its top bar, or on a narrow screen (where the
 * panel is the whole screen) "‹ {collection}" at its start (spec 9).
 */
export function PanelClose({
  back,
  backLabel,
  label,
  onClose,
}: {
  back?: string
  /** "Back to {collection}", for screen readers. */
  backLabel?: string
  label: string
  onClose: () => void
}) {
  return (
    <Show
      as="span"
      when={back}
      className={cn('flex', back && 'order-first')}
      fallback={
        <Button
          look="ghost"
          size="sm"
          aria-label={label}
          onPress={onClose}
          className="h-7 min-w-7 px-1.5"
        >
          <X size={14} />
        </Button>
      }
    >
      {(name) => (
        <Button
          look="ghost"
          size="sm"
          aria-label={backLabel}
          onPress={onClose}
          className="-ms-2 px-2"
        >
          <span aria-hidden>‹</span> {name}
        </Button>
      )}
    </Show>
  )
}

/** The text of an error: red, small, announced to screen readers. */
export function ErrorText({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p role="alert" className={cn('truncate text-xs text-danger', className)}>
      {children}
    </p>
  )
}
