import { Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../ui-kit'

/**
 * The value as text, looking like its editor at rest. It takes the focus, so the
 * keyboard moves into it as into a field (the table's arrow keys, Tab in the panel);
 * then it wakes and the focus moves on to the editor (`useHandFocus`).
 *
 * In the panel it copies the field's look: its padding, the calendar button of a date
 * or a period, the two chevrons of a number.
 */
export function Asleep({
  text,
  end,
  look = 'cell',
  icon,
}: {
  text: string | null
  /** Room for the number's chevrons. */
  end?: boolean
  look?: 'cell' | 'panel'
  /** What the editor shows after its value, in the panel. */
  icon?: 'calendar' | 'steps'
}) {
  const value = text ?? <span className="text-muted">—</span>
  if (look === 'cell')
    return (
      <span
        data-asleep
        tabIndex={-1}
        className={cn(
          'block truncate tabular-nums outline-none',
          end && 'pe-6',
        )}
      >
        {value}
      </span>
    )
  return (
    <span
      data-asleep
      tabIndex={0}
      className={cn(
        'relative -ms-2 flex w-fit max-w-full cursor-text items-center gap-1 rounded-[var(--field-radius)] px-2 py-1 tabular-nums outline-none hover:bg-default focus-visible:bg-default',
        icon === 'steps' && 'min-w-14 pe-6',
      )}
    >
      <span className="truncate">{value}</span>
      {AFTER[icon ?? 'none']}
    </span>
  )
}

/** The editor's buttons, drawn still. */
const AFTER = {
  none: null,
  calendar: (
    <span className="flex p-0.5 text-muted">
      <Calendar size={12} />
    </span>
  ),
  steps: (
    <span className="absolute end-1 flex flex-col gap-px text-muted">
      <span className="flex h-[11px] w-4 items-center justify-center">
        <ChevronUp size={10} />
      </span>
      <span className="flex h-[11px] w-4 items-center justify-center">
        <ChevronDown size={10} />
      </span>
    </span>
  ),
}
