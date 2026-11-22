import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActionMenu,
  Button,
  Icon,
  Match,
  MenuPopover,
  MenuTrigger,
  Show,
  Switch,
  type MenuAction,
} from '../../ui-kit'
import type { CollectionDefinition, PanelDefinition } from '../definition'
import { PanelClose } from '../parts'
import { RecordBody, RecordPlaceholders } from './RecordBody'
import { isViewOnly, useRecord } from './recordQuery'
import type { Id, ReportInvalid, SaveChange } from '../types'

/** The More actions button and its menu (spec 7.4). */
export function MoreActions({
  actions,
  onAction,
}: {
  actions: MenuAction[]
  onAction: (id: string) => void
}) {
  const { t } = useTranslation('collection')
  return (
    <MenuTrigger>
      <Button
        look="ghost"
        size="sm"
        aria-label={t('actions.more')}
        className="px-2"
      >
        <Icon name="lucide/ellipsis" size={16} />
      </Button>
      <MenuPopover minWidth={200}>
        <ActionMenu
          label={t('actions.more')}
          actions={actions}
          onAction={onAction}
        />
      </MenuPopover>
    </MenuTrigger>
  )
}

/**
 * The record panel, beside the list (spec 7): the record from the list shows at once,
 * then the server's copy replaces it. It is a landmark, not a dialog: the list stays
 * usable, and the focus moves to the record's title when a record opens.
 */
export function RecordPanel<T, C>({
  definition,
  panel,
  context,
  id,
  fromList,
  onClose,
  back,
  onUnavailable,
  canEdit,
  save,
  report,
  actions,
  onAction,
}: {
  definition: CollectionDefinition<T, C>
  panel: PanelDefinition<T>
  context: C
  id: Id
  /** The record as the list has it, shown while the server's copy loads. */
  fromList: T | undefined
  onClose: () => void
  /** Narrow screens: the collection's name, for the way back. */
  back?: string
  onUnavailable: (id: Id) => void
  /** Whether the person may change a value (spec 7.7). */
  canEdit: (record: T, id: string) => boolean
  save: SaveChange<T>
  report: ReportInvalid<T>
  /** The More actions menu's entries for a record. */
  actions: (record: T) => MenuAction[]
  onAction: (action: string, record: T) => void
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const { query, record, unavailable } = useRecord({
    definition,
    context,
    id,
    fromList,
    onUnavailable,
  })
  /** The record, once it can show (loaded, not removed). */
  const visible = unavailable ? undefined : record
  const shown = visible !== undefined

  // Each record that opens takes the focus to its title (spec 10), once it shows.
  const focusTitle = useCallback(
    (node: HTMLHeadingElement | null) => node?.focus({ preventScroll: true }),
    // A new record: a new callback, so the title takes the focus again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  )

  return (
    <aside
      aria-label={record ? panel.title(record) : t('collection:panel.label')}
      className="scroll-quiet flex h-full w-full flex-col overflow-y-auto border-s border-border ps-8 pe-6"
    >
      <div className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 bg-background">
        <Show as="span" when={visible}>
          {(loaded) => panel.type(loaded)}
        </Show>
        <Show as="span" when={shown && isViewOnly(panel, record as T, canEdit)}>
          <span className="text-xs text-muted">
            {t('collection:panel.viewOnly')}
          </span>
        </Show>
        <span className="ms-auto flex items-center gap-1">
          <Show as="span" when={visible}>
            {(loaded) => (
              <MoreActions
                actions={actions(loaded)}
                onAction={(action) => onAction(action, loaded)}
              />
            )}
          </Show>
          <Show as="span" when={!back}>
            <PanelClose label={t('collection:panel.close')} onClose={onClose} />
          </Show>
        </span>
        <Show as="span" when={back} className="order-first">
          {(name) => (
            <PanelClose
              back={name}
              backLabel={t('collection:panel.back', { name })}
              label={t('collection:panel.close')}
              onClose={onClose}
            />
          )}
        </Show>
      </div>

      <Switch>
        <Match when={unavailable}>
          <div role="alert" className="flex flex-col items-start gap-3 py-16">
            <h2 className="text-lg font-medium">
              {t('collection:panel.unavailable')}
            </h2>
            <Button onPress={onClose}>{t('collection:panel.close')}</Button>
          </div>
        </Match>
        <Match when={query.isError && !record}>
          <div role="alert" className="flex flex-col items-start gap-3 py-16">
            <p>{t('collection:panel.error')}</p>
            <div className="flex gap-2">
              <Button onPress={() => query.refetch()}>
                {t('collection:error.retry')}
              </Button>
              <Button look="ghost" onPress={onClose}>
                {t('collection:panel.close')}
              </Button>
            </div>
          </div>
        </Match>
        <Match when={!record}>
          <RecordPlaceholders label={t('collection:panel.loading')} />
        </Match>
        <Match when={record}>
          {(loaded) => (
            <div className="pt-2 pb-8">
              <RecordBody
                definition={definition}
                panel={panel}
                id={id}
                record={loaded}
                canEdit={canEdit}
                save={save}
                report={report}
                focusTitle={focusTitle}
                layout="panel"
              />
            </div>
          )}
        </Match>
      </Switch>
    </aside>
  )
}
