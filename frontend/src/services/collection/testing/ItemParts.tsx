import { useTranslation } from 'react-i18next'
import type { Part } from './parts'
import { ChipList } from '..'
import type { Item } from './items'

/** Small pieces the test collection's cells are made of. */
export function StatusChip({ status }: { status: Item['status'] }) {
  const { t } = useTranslation('test-items')
  const look =
    status === 'valid'
      ? 'bg-[var(--success-soft)] text-[var(--success-soft-foreground)]'
      : status === 'outdated'
        ? 'bg-[var(--warning-soft)] text-[var(--warning-soft-foreground)]'
        : 'bg-default text-foreground'
  return (
    <span
      className={`inline-flex h-5 w-fit shrink-0 items-center rounded-[var(--field-radius)] px-2 text-xs font-medium ${look}`}
    >
      {t(`status.${status}`)}
    </span>
  )
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-[var(--field-radius)] bg-default text-xs font-medium"
    >
      {initials}
    </span>
  )
}

export function Day({ iso }: { iso: string }) {
  const { i18n } = useTranslation()
  return (
    <>
      {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
        new Date(iso),
      )}
    </>
  )
}

/** The record's kind, in the panel's top bar. */
export function TypeChip() {
  const { t } = useTranslation('test-items')
  return (
    <span className="inline-flex h-5 items-center rounded-[var(--field-radius)] bg-default px-2 text-xs font-medium">
      {t('type')}
    </span>
  )
}

/** The item's tags as chips (the first ones, then "+n"). */
export function Tags({ tags, max }: { tags: string[]; max?: number }) {
  const { t } = useTranslation('test-items')
  return <ChipList labels={tags.map((tag) => t(`tags.${tag}`))} max={max} />
}

/** A period in the user's language ("Dec 1 – 5, 2026"), or "—". */
export function Period({ range }: { range: Item['planned'] }) {
  const { i18n } = useTranslation()
  if (!range) return <span className="text-muted">—</span>
  const format = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return <>{format.formatRange(new Date(range.start), new Date(range.end))}</>
}

/** The parts' kind chip (step 12's second collection). */
export function PartChip() {
  const { t } = useTranslation('test-parts')
  return (
    <span className="inline-flex h-5 items-center rounded-[var(--field-radius)] bg-default px-2 text-xs font-medium">
      {t('type')}
    </span>
  )
}
export function KindText({ part }: { part: Part }) {
  const { t } = useTranslation('test-parts')
  return <>{t(`kinds.${part.kind}`)}</>
}

/** The checks' chip in the panel's top bar. */
export function CheckChip() {
  const { t } = useTranslation('test-checks')
  return (
    <span className="inline-flex h-5 items-center rounded-[var(--field-radius)] bg-default px-2 text-xs font-medium">
      {t('type')}
    </span>
  )
}
