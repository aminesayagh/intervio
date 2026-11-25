import { Ellipsis, Maximize2, Minimize2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActionMenu,
  Button,
  Match,
  MenuPopover,
  MenuTrigger,
  Show,
  Variant,
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
        className="h-7 min-w-7 px-1.5"
      >
        <Ellipsis size={14} />
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
  onLeave,
  onUnavailable,
  canEdit,
  save,
  report,
  actions,
  onAction,
  expand,
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
  /**
   * A linked record (decision 137): × goes back one step (onClose), and on a narrow
   * screen "‹ {collection}" leaves for the list.
   */
  onLeave?: () => void
  onUnavailable: (id: Id) => void
  /** Whether the person may change a value (spec 7.7). */
  canEdit: (record: T, id: string) => boolean
  save: SaveChange<T>
  report: ReportInvalid<T>
  /** The More actions menu's entries for a record. */
  actions: (record: T) => MenuAction[]
  onAction: (action: string, record: T) => void
  /**
   * Over the list, which folds into a strip (decision 157): its button, and × brings
   * the panel back beside the list before it closes.
   */
  expand?: { wide: boolean; toggle: () => void }
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

  // The title gone under the top bar: the bar shows the name (decision 156).
  const title = useRef<HTMLHeadingElement | null>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [titleGone, setTitleGone] = useState(false)
  function scrolled() {
    const heading = title.current?.getBoundingClientRect()
    const top = bar.current?.getBoundingClientRect()
    setTitleGone(!!heading && !!top && heading.bottom <= top.bottom)
  }

  // Each record that opens takes the focus to its title (spec 10), once it shows.
  const focusTitle = useCallback(
    (node: HTMLHeadingElement | null) => {
      title.current = node
      node?.focus({ preventScroll: true })
      scrolled() // a new record: its title may already be under the bar
    },
    // A new record: a new callback, so the title takes the focus again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  )

  return (
    <aside
      onScroll={scrolled}
      aria-label={record ? panel.title(record) : t('collection:panel.label')}
      className="relative flex h-full w-full flex-col overflow-y-auto border-s border-border ps-8 pe-6"
    >
      {/* Its line runs across the whole panel (decision 152): -ms/-me undo the padding. */}
      <div
        ref={bar}
        className="sticky top-0 z-10 -ms-8 -me-6 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background ps-8 pe-6 pt-4 lg:h-[4.5rem] lg:pt-6"
      >
        <Show as="span" when={visible}>
          {(loaded) => panel.type(loaded)}
        </Show>
        <Show
          as="span"
          when={titleGone && visible}
          aria-hidden // the panel is already named after it
          className="min-w-0 truncate font-medium"
        >
          {(loaded) => panel.title(loaded)}
        </Show>
        <Show as="span" when={shown && isViewOnly(panel, record as T, canEdit)}>
          <span className="text-xs text-muted">
            {t('collection:panel.viewOnly')}
          </span>
        </Show>
        <span className="ms-auto flex items-center gap-1">
          {/* Wider, the list folded into a strip, or back (decision 157). */}
          <Show as="span" when={expand}>
            {({ wide, toggle }) => (
              <Button
                look="ghost"
                size="sm"
                aria-label={t(
                  wide ? 'collection:panel.reduce' : 'collection:panel.expand',
                )}
                onPress={toggle}
                className="h-7 min-w-7 px-1.5"
              >
                <Variant
                  as="span"
                  className="flex"
                  value={wide ? 'wide' : 'beside'}
                  views={{
                    wide: () => <Minimize2 size={14} />,
                    beside: () => <Maximize2 size={14} />,
                  }}
                />
              </Button>
            )}
          </Show>
          <Show
            as="span"
            when={
              visible !== undefined && actions(visible).length > 0 && visible
            }
          >
            {(loaded) => (
              <MoreActions
                actions={actions(loaded)}
                onAction={(action) => onAction(action, loaded)}
              />
            )}
          </Show>
          <Show as="span" when={!back || onLeave}>
            <PanelClose
              label={t(
                expand?.wide
                  ? 'collection:panel.reduce'
                  : 'collection:panel.close',
              )}
              onClose={expand?.wide ? expand.toggle : onClose}
            />
          </Show>
        </span>
        <Show as="span" when={back} className="order-first">
          {(name) => (
            <PanelClose
              back={name}
              backLabel={t('collection:panel.back', { name })}
              label={t('collection:panel.close')}
              onClose={onLeave ?? onClose}
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
            // In the same render as the panel: the table no longer renders when a record
            // opens (spec 8), and the panel's editors wait until they are reached.
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
                context={context}
              />
            </div>
          )}
        </Match>
      </Switch>
    </aside>
  )
}
