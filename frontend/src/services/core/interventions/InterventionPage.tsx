import { Button } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { fileUrl, formatSize } from '../../files'
import { usePath } from '../../navigation'
import { FormError, Icon } from '../../ui-kit'
import {
  errorKey,
  formatDay,
  interventionApi,
  interventionsKey,
  useIntervention,
  type Intervention,
} from './api'

/** An intervention (decision 95): its title, the subtabs (Overview for now), the open subtab. */
export function InterventionPage() {
  const { t } = useTranslation('interventions')
  const id = usePath().split('/')[2]
  const queryClient = useQueryClient()
  const { data, isError } = useIntervention(id)

  // Opening it moved it to the top of the sidebar's list.
  useEffect(() => {
    if (data)
      void queryClient.invalidateQueries({
        queryKey: [...interventionsKey, 'recent'],
      })
  }, [data?.id, queryClient]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isError)
    return (
      <p className="text-muted">{t('errors.ERROR_INTERVENTION_NOT_FOUND')}</p>
    )
  if (!data) return null
  return (
    <>
      <h1 className="truncate text-xl font-medium">{data.title}</h1>
      <nav
        aria-label={t('subtabs')}
        className="mt-4 flex gap-6 border-b border-border"
      >
        <span
          aria-current="page"
          className="-mb-px border-b-2 border-foreground pb-2 font-medium"
        >
          {t('overview')}
        </span>
      </nav>
      <Overview intervention={data} />
    </>
  )
}

function Overview({ intervention }: { intervention: Intervention }) {
  const { t, i18n } = useTranslation('interventions')
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function publish() {
    setError(null)
    setPending(true)
    try {
      const published = await interventionApi.publish(intervention.id)
      queryClient.setQueryData(
        [...interventionsKey, 'one', published.id],
        published,
      )
      await queryClient.invalidateQueries({ queryKey: interventionsKey })
    } catch (e) {
      setError(errorKey(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-6 flex max-w-[552px] flex-col gap-6">
      <dl className="grid grid-cols-[192px_1fr] gap-y-3">
        <Row label={t('status.label')}>
          {intervention.publishedAt
            ? t('publishedOn', {
                date: new Intl.DateTimeFormat(i18n.language, {
                  dateStyle: 'medium',
                }).format(new Date(intervention.publishedAt)),
              })
            : t(`status.${intervention.status}`)}
        </Row>
        <Row label={t('form.offerDeadline')}>
          {formatDay(intervention.offerDeadline, i18n.language)}
        </Row>
      </dl>
      {intervention.description && (
        <section>
          <h2 className="text-muted">{t('form.description')}</h2>
          <p className="mt-1 whitespace-pre-line">{intervention.description}</p>
        </section>
      )}
      <section>
        <h2 className="text-muted">{t('form.specifications')}</h2>
        {intervention.specifications.length === 0 ? (
          <p className="mt-1">{t('noSpecifications')}</p>
        ) : (
          <ul className="mt-1 flex flex-col">
            {intervention.specifications.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 border-b border-border py-2"
              >
                <Icon name="Document" size={16} className="text-muted" />
                <a
                  href={fileUrl(doc.id)}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {doc.name}
                </a>
                <span className="text-xs text-muted">
                  {formatSize(doc.sizeBytes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {intervention.status === 'draft' && (
        <div className="flex flex-col gap-2">
          <FormError
            message={
              error && t(error, { defaultValue: t('errors.ERROR_UNKNOWN') })
            }
          />
          <Button isPending={pending} onPress={publish} className="w-fit">
            {t('publish')}
          </Button>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </>
  )
}
