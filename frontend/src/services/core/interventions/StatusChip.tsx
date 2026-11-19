import { Chip } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import type { InterventionStatus } from './api'

/** Draft (neutral) or Published (green). */
export function StatusChip({ status }: { status: InterventionStatus }) {
  const { t } = useTranslation('interventions')
  return (
    <Chip
      size="sm"
      variant="soft"
      color={status === 'published' ? 'success' : 'default'}
      className="w-fit shrink-0"
    >
      <Chip.Label>{t(`status.${status}`)}</Chip.Label>
    </Chip>
  )
}
