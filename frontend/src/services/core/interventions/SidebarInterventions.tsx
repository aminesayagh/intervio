import { useTranslation } from 'react-i18next'
import { Link, usePath } from '../../navigation'
import { Icon } from '../../ui-kit'
import { useRecentInterventions } from './api'

const LIMIT = 6

/**
 * The sidebar's Interventions section (decision 92): the six last opened, "All interventions"
 * when the company has more, and the create button, always shown. Collapsed: only the button.
 */
export function SidebarInterventions({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const { t } = useTranslation('interventions')
  const path = usePath()
  const { data } = useRecentInterventions()
  const create = path === '/interventions/new'
  // An intervention stays highlighted on any of its subtabs.
  const isOpen = (id: string) =>
    path === `/interventions/${id}` || path.startsWith(`/interventions/${id}/`)

  if (collapsed)
    return (
      <Link
        href="/interventions/new"
        onClick={onNavigate}
        aria-label={t('create')}
        title={t('create')}
        className={`mt-4 flex h-9 items-center justify-center rounded-[var(--field-radius)] border border-border ${
          create
            ? 'bg-default text-foreground'
            : 'text-muted hover:bg-default hover:text-foreground'
        }`}
      >
        <Icon name="Add" size={18} />
      </Link>
    )

  const entry = (active: boolean) =>
    `flex h-9 items-center rounded-[var(--field-radius)] px-2 ${
      active
        ? 'bg-default font-medium text-foreground'
        : 'text-muted hover:bg-default hover:text-foreground'
    }`
  return (
    <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
      <p className="mb-1 px-2 text-xs text-muted">{t('title')}</p>
      {data?.items.map((item) => (
        <Link
          key={item.id}
          href={`/interventions/${item.id}`}
          onClick={onNavigate}
          aria-current={isOpen(item.id) ? 'page' : undefined}
          className={entry(isOpen(item.id))}
        >
          <span className="truncate">{item.title}</span>
        </Link>
      ))}
      {data && data.total > LIMIT && (
        <Link
          href="/interventions"
          onClick={onNavigate}
          aria-current={path === '/interventions' ? 'page' : undefined}
          className={entry(path === '/interventions')}
        >
          {t('all')}
        </Link>
      )}
      <Link
        href="/interventions/new"
        onClick={onNavigate}
        aria-current={create ? 'page' : undefined}
        className={`mt-2 flex h-9 items-center justify-center gap-2 rounded-[var(--field-radius)] border border-border ${
          create ? 'bg-default text-foreground' : 'hover:bg-default'
        }`}
      >
        <Icon name="Add" size={16} />
        {t('create')}
      </Link>
    </div>
  )
}
