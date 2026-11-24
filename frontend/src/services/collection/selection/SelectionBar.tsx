import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../ui-kit'

/**
 * The toolbar while rows are selected (spec 8.5): how many, the actions allowed on at
 * least one of them, and × to clear the selection. It takes the place of the search
 * and the filters, which come back when the selection is empty.
 */
export function SelectionBar({
  count,
  actions,
  onClear,
}: {
  count: number
  actions: { id: string; label: string; run: () => void }[]
  onClear: () => void
}) {
  const { t } = useTranslation('collection')
  return (
    <div
      role="toolbar"
      aria-label={t('selection.label')}
      className="flex min-h-9 flex-wrap items-center gap-2"
    >
      <span aria-live="polite" className="me-2">
        {t('selection.count', { count })}
      </span>
      {actions.map((action) => (
        <Button key={action.id} size="sm" onPress={action.run}>
          {action.label}
        </Button>
      ))}
      <Button
        size="sm"
        look="ghost"
        aria-label={t('selection.clear')}
        onPress={onClear}
      >
        <X size={14} />
      </Button>
    </div>
  )
}
