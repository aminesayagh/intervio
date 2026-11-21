import { useTranslation } from 'react-i18next'
import type { Item } from './items'

/** Small pieces the test collection's cards and cells are made of. */
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
