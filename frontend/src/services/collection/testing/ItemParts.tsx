import { Chip } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import type { Item } from './items'

/** Small pieces the test collection's cards and cells are made of. */
export function StatusChip({ status }: { status: Item['status'] }) {
  const { t } = useTranslation('test-items')
  return (
    <Chip
      size="sm"
      variant="soft"
      color={
        status === 'valid'
          ? 'success'
          : status === 'outdated'
            ? 'warning'
            : 'default'
      }
      className="w-fit shrink-0"
    >
      <Chip.Label>{t(`status.${status}`)}</Chip.Label>
    </Chip>
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
