import { useTranslation } from 'react-i18next'
import { Link } from '../navigation'
import { Match, Show, Switch } from '../ui-kit'
import type { CollectionDefinition, PanelDefinition } from './definition'
import type { MenuAction } from './parts'
import { RecordBody, RecordPlaceholders } from './RecordBody'
import { MoreActions } from './RecordPanel'
import { isViewOnly, useRecord } from './recordQuery'
import type { Id } from './types'

/**
 * A record as the main view (spec 13, "Open full page"): a breadcrumb back to the list
 * (which opens the panel on the record), then the record in two columns.
 */
export function RecordPage<T, C>({
  definition,
  panel,
  context,
  id,
  listHref,
  canEdit,
  save,
  actions,
  onAction,
}: {
  definition: CollectionDefinition<T, C>
  panel: PanelDefinition<T>
  context: C
  id: Id
  /** The list's address, with this record open in the panel. */
  listHref: string
  canEdit: (record: T, id: string) => boolean
  save: (record: T, patch: Partial<T>) => Promise<void>
  actions: (record: T) => MenuAction[]
  onAction: (action: string, record: T) => void
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const { query, record, unavailable } = useRecord({ definition, context, id })
  const shown = record !== undefined && !unavailable

  return (
    <article className="flex flex-col gap-4">
      <nav
        aria-label={t('collection:page.breadcrumb')}
        className="text-xs text-muted"
      >
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href={listHref} className="hover:text-foreground">
              {t(definition.i18n.title)}
            </Link>
          </li>
          <Show as="span" when={shown}>
            <li
              aria-current="page"
              className="flex items-center gap-1.5 text-foreground"
            >
              <span aria-hidden className="text-muted">
                ›
              </span>
              {record !== undefined && panel.title(record)}
            </li>
          </Show>
        </ol>
      </nav>

      <div className="flex h-8 items-center gap-2">
        <Show as="span" when={shown}>
          {record !== undefined && panel.type(record)}
        </Show>
        <Show as="span" when={shown && isViewOnly(panel, record as T, canEdit)}>
          <span className="text-xs text-muted">
            {t('collection:panel.viewOnly')}
          </span>
        </Show>
        <span className="ms-auto">
          <Show as="span" when={shown}>
            {record !== undefined && (
              <MoreActions
                actions={actions(record)}
                onAction={(action) => onAction(action, record)}
              />
            )}
          </Show>
        </span>
      </div>

      <Switch>
        <Match when={unavailable}>
          <div role="alert" className="py-16">
            <h1 className="text-lg font-medium">
              {t('collection:panel.unavailable')}
            </h1>
          </div>
        </Match>
        <Match when={query.isError && !record}>
          <p role="alert" className="py-16">
            {t('collection:panel.error')}
          </p>
        </Match>
        <Match when={!record}>
          <RecordPlaceholders label={t('collection:panel.loading')} />
        </Match>
        <Match when={record}>
          {(loaded) => (
            <RecordBody
              definition={definition}
              panel={panel}
              id={id}
              record={loaded}
              canEdit={canEdit}
              save={save}
              layout="page"
            />
          )}
        </Match>
      </Switch>
    </article>
  )
}
