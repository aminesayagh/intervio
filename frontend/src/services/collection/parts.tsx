import { Play, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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

/**
 * The title row of a part of the record (a text, linked records), decision 159: a
 * small grey triangle in the margin, shown while the pointer is over the part (its
 * container carries `group/part`) or reached with the keyboard, folds the part
 * away; then its icon and title, and what ends the row (a status, Show all).
 */
export function FoldTitle({
  icon,
  label,
  folded,
  onFold,
  children,
}: {
  icon: ReactNode
  label: string
  folded: boolean
  onFold: () => void
  children?: ReactNode
}) {
  const { t } = useTranslation('collection')
  return (
    <div className="flex min-h-8 items-center gap-2">
      <h3 className="relative flex items-center gap-1.5 font-medium text-muted">
        <button
          type="button"
          aria-expanded={!folded}
          aria-label={t(folded ? 'description.show' : 'description.hide', {
            name: label,
          })}
          onClick={onFold}
          className="absolute -start-5 flex size-4 cursor-pointer items-center justify-center rounded-[var(--field-radius)] text-muted opacity-0 outline-none group-hover/part:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-foreground"
        >
          <Play
            size={8}
            fill="currentColor"
            className={cn(
              'transition-transform motion-reduce:transition-none',
              !folded && 'rotate-90',
            )}
          />
        </button>
        {icon}
        {label}
      </h3>
      {children}
    </div>
  )
}
