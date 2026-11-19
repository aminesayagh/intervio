import { useTranslation } from 'react-i18next'
import { Link } from '../../navigation'
import { formatDay, useInterventions } from './api'

/** "All interventions": a gallery of cards, most recently updated first (decision 93). */
export function AllInterventionsPage() {
  const { t, i18n } = useTranslation('interventions')
  const { data } = useInterventions()
  return (
    <>
      <h1 className="text-xl font-medium">{t('all')}</h1>
      {data?.length === 0 && <p className="mt-4 text-muted">{t('none')}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data?.map((item) => (
          <Link
            key={item.id}
            href={`/interventions/${item.id}`}
            className="flex flex-col gap-1 rounded-[var(--field-radius)] border border-border bg-surface p-5 hover:border-foreground/30"
          >
            <span className="truncate font-medium">{item.title}</span>
            <span className="text-xs text-muted">
              {t(`status.${item.status}`)}
            </span>
            <span className="mt-3">
              {t('offersDue', {
                date: formatDay(item.offerDeadline, i18n.language),
              })}
            </span>
            <span className="text-muted">
              {t('documents', { count: item.documentCount })}
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}
