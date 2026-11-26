import { Button, Chip } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FilePreview, formatSize } from '../../files'
import { Link, usePath } from '../../navigation'
import { Icon } from '../../ui-kit'
import { notify } from '../../notifications'
import {
  errorKey,
  formatDay,
  interventionApi,
  interventionsKey,
  useIntervention,
  type Intervention,
  type InterventionDocument,
} from './api'
import { StatusChip } from './StatusChip'

/** The subtabs: Overview at /interventions/{id}, Resources at /interventions/{id}/resources. */
const TABS = [
  { path: '', label: 'overview' },
  { path: '/resources', label: 'resources' },
] as const

/** An intervention (decision 95): its title, the subtabs, the open subtab. */
export function InterventionPage() {
  const { t } = useTranslation('interventions')
  const [, , id, tab = ''] = usePath().split('/')
  const current = tab ? `/${tab}` : ''
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
        {TABS.map((item) => (
          <Link
            key={item.path}
            href={`/interventions/${id}${item.path}`}
            aria-current={item.path === current ? 'page' : undefined}
            className={`-mb-px border-b-2 pb-2 ${
              item.path === current
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {t(item.label)}
          </Link>
        ))}
      </nav>
      {current === '/resources' ? (
        <Resources intervention={data} />
      ) : (
        <Overview intervention={data} />
      )}
    </>
  )
}

function Overview({ intervention }: { intervention: Intervention }) {
  const { t, i18n } = useTranslation('interventions')
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)

  async function publish() {
    setPending(true)
    try {
      const published = await interventionApi.publish(intervention.id)
      queryClient.setQueryData(
        [...interventionsKey, 'one', published.id],
        published,
      )
      await queryClient.invalidateQueries({ queryKey: interventionsKey })
    } catch (e) {
      notify({
        tone: 'error',
        text: t(errorKey(e), { defaultValue: t('errors.ERROR_UNKNOWN') }),
        key: 'InterventionPage:Overview',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-6 flex max-w-[552px] flex-col gap-6">
      <dl className="grid grid-cols-[192px_1fr] gap-y-3">
        <Row label={t('status.label')}>
          <span className="flex items-center gap-2">
            <StatusChip status={intervention.status} />
            {intervention.publishedAt && (
              <span className="text-muted">
                {t('publishedOn', {
                  date: new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: 'medium',
                  }).format(new Date(intervention.publishedAt)),
                })}
              </span>
            )}
          </span>
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
      {intervention.status === 'draft' && (
        <div className="flex flex-col gap-2">
          <Button isPending={pending} onPress={publish} className="w-fit">
            {t('publish')}
          </Button>
        </div>
      )}
    </div>
  )
}

/** Resources tab: the intervention's resources (documents for now), each with its type. */
function Resources({ intervention }: { intervention: Intervention }) {
  const { t } = useTranslation('interventions')
  const [open, setOpen] = useState<InterventionDocument | null>(null)
  const typeChip = (doc: InterventionDocument) => (
    <Chip size="sm" variant="soft" className="shrink-0">
      <Chip.Label>{t(`documentType.${doc.type}`)}</Chip.Label>
    </Chip>
  )
  return (
    <div className="mt-6 max-w-[552px]">
      {intervention.documents.length === 0 ? (
        <p className="text-muted">{t('noResources')}</p>
      ) : (
        <ul className="flex flex-col">
          {intervention.documents.map((doc) => (
            <li key={doc.id} className="border-b border-border">
              {/* Opens the preview drawer instead of downloading. */}
              <button
                type="button"
                onClick={() => setOpen(doc)}
                className="flex w-full items-center gap-2 py-2 text-start hover:bg-default"
              >
                <Icon name="Document" size={16} className="text-muted" />
                {typeChip(doc)}
                <span className="min-w-0 flex-1 truncate">{doc.name}</span>
                <span className="text-xs text-muted">
                  {formatSize(doc.sizeBytes)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <FilePreview file={open} onClose={() => setOpen(null)} />
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
