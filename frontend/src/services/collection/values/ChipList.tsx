import { useTranslation } from 'react-i18next'
import { Show } from '../../ui-kit'

/**
 * Several chosen values as chips (a multi select's read view): the first `max`,
 * then "+n" for the others; "—" when none.
 */
export function ChipList({
  labels,
  max = 2,
}: {
  labels: string[]
  max?: number
}) {
  const { t } = useTranslation('collection')
  const more = labels.length - max
  return (
    <Show
      as="span"
      when={labels.length > 0}
      className="flex min-w-0 items-center gap-1"
      fallback={<span className="text-muted">—</span>}
    >
      {labels.slice(0, max).map((label) => (
        <span
          key={label}
          className="inline-flex h-5 shrink-0 items-center rounded-[var(--field-radius)] bg-default px-2 text-xs font-medium"
        >
          {label}
        </span>
      ))}
      <Show as="span" when={more > 0} className="shrink-0 text-xs text-muted">
        {t('fields.more', { count: more })}
      </Show>
    </Show>
  )
}
