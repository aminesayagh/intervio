import {
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../http'
import { addTranslations } from '../i18n'
import { dismissKey, dismissScope, notify } from '../notifications'
import {
  entryState,
  navigate,
  setSearchParams,
  usePath,
  useSearchParams,
} from '../navigation'
import {
  Button,
  cn,
  ConfirmDialog,
  foldSidebar,
  Icon,
  Match,
  type MenuAction,
  Show,
  Switch,
} from '../ui-kit'
import { cache, keys, useCollectionQuery } from './data/collectionQuery'
import type {
  ActionDefinition,
  CollectionDefinition,
  ColumnDefinition,
} from './definition'
import en from './locales/en.json'
import fr from './locales/fr.json'
import { RecordPage } from './record/RecordPage'
import {
  clampPanel,
  openingWidth,
  PANEL,
  panelLimits,
  useLayoutMode,
} from './layout/layout'
import { NewRecord } from './create/NewRecord'
import { PanelDivider } from './layout/PanelDivider'
import { RecordPanel } from './record/RecordPanel'
import { newRecordKey } from './record/recordQuery'
import { Toolbar } from './list/Toolbar'
import type { Id, ListQuery, ReportInvalid, SaveChange } from './types'
import { useCollectionList } from './list/useCollectionList'
import { ValueField } from './values/ValueField'
import {
  isNarrowed,
  useCollectionState,
  writeListing,
} from './list/useCollectionState'

addTranslations('collection', { en, fr })

/** What the list parts need from the query to load more (spec 8.1). */
type More = {
  canLoadMore: boolean
  loadMore: () => void
  hasMore: boolean
  pages: number
  memory: { key: string; address: string }
}

/**
 * A collection screen (spec 4–5): the list of one kind of record, as a table (other
 * views come later).
 * It knows nothing about the records; the definition says how to fetch and show them.
 * It fills the screen's height, and only its list scrolls (spec 8.1).
 */
export function Collection<T extends RowData, C = void>({
  definition,
  context,
  basePath,
}: {
  definition: CollectionDefinition<T, C>
  context?: C
  /**
   * The list's address (spec 12, 13); a record's full page is {basePath}/{id}.
   * Defaults to /{definition.key}.
   */
  basePath?: string
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const scrollRef = useRef<HTMLDivElement>(null)
  const state = useCollectionState(definition.key, definition.defaultSort)
  const { listing } = state
  const narrowed = isNarrowed(listing)
  const list = useCollectionQuery({
    key: definition.key,
    source: definition.source,
    context: context as C,
    listing: state.query,
  })
  // Saves a change made in place, then shows the saved record everywhere (spec 8.3).
  const queryClient = useQueryClient()
  const { source, getId, key } = definition

  /** Whether the person may change a value of a record (spec 7.7). */
  const { rights } = definition
  const canEdit = useCallback(
    (record: T, id: string) =>
      !rights || rights(record, context as C).edit.includes(id),
    [rights, context],
  )
  // The open record (spec 6.3, 7.1): its id is in the address (?open=).
  const openId = useSearchParams().get('open')
  const panelMark = `panel:${key}`
  const open = useCallback(
    (id: Id) => {
      const params = new URLSearchParams(window.location.search)
      if (params.get('open') === id) return
      const wasOpen = params.has('open')
      params.set('open', id)
      // Opening pushes an entry (Back closes); switching records replaces it.
      setSearchParams(params, {
        replace: wasOpen,
        state: wasOpen ? entryState() : { panel: panelMark },
      })
    },
    [panelMark],
  )
  const doClose = useCallback(() => {
    if (entryState().panel === panelMark) window.history.back()
    else {
      const params = new URLSearchParams(window.location.search)
      params.delete('open')
      setSearchParams(params, { replace: true })
    }
  }, [panelMark])

  // Messages (decision 132): each belongs to a record or to the collection, and
  // leaves with it; one about a value is replaced by the next one about that value.
  const nameOf = useCallback(
    (record: T) => definition.panel?.title(record) ?? getId(record),
    [definition.panel, getId],
  )
  const recordScope = useCallback((id: Id) => `${key}:record:${id}`, [key])
  useEffect(() => () => dismissScope(key), [key])
  // The panel's record and the full page's record: leaving one takes its messages away.
  useEffect(() => {
    const scope = openId ? recordScope(openId) : null
    return () => {
      if (scope) dismissScope(scope)
    }
  }, [openId, recordScope])
  const shownPage = window.location.pathname.startsWith(
    `${basePath ?? `/${key}`}/`,
  )
    ? decodeURIComponent(
        window.location.pathname.slice((basePath ?? `/${key}`).length + 1),
      )
    : null
  useEffect(() => {
    const scope = shownPage ? recordScope(shownPage) : null
    return () => {
      if (scope) dismissScope(scope)
    }
  }, [shownPage, recordScope])

  /**
   * Saves a change made in place, then shows the saved record everywhere (spec 8.3).
   * A refused or failed change is reported (7.8) and rethrown, so the field puts its
   * value back. `field` names the value for the message; `quiet` leaves the failure
   * to the caller (the description has its own status line).
   */
  const save = useCallback(
    async function saveChange(
      record: T,
      patch: Partial<T>,
      field?: { label: string; quiet?: boolean },
    ): Promise<void> {
      if (!source.update) throw new Error(`${key} cannot be edited`)
      const id = getId(record)
      const valueKey = field && `${key}:${id}:${field.label}`
      const words = { field: field?.label, name: nameOf(record) }
      try {
        const updated = await source.update(id, patch, context as C)
        cache.updated(queryClient, key, updated, getId)
        if (valueKey) dismissKey(valueKey)
      } catch (refusal) {
        const status = refusal instanceof ApiError ? refusal.status : 0
        if (status === 403) {
          // No right any more: reload the record and the lists, so their rights are current.
          void queryClient.invalidateQueries({ queryKey: keys.record(key, id) })
          void cache.refresh(queryClient, key)
          notify({
            tone: 'error',
            text: t('collection:message.forbidden', words),
            scope: recordScope(id),
            key: valueKey,
          })
        } else if (status === 404) {
          // Removed by someone else: the list refreshes and the panel closes.
          cache.removed(queryClient, key, id, getId)
          void cache.refresh(queryClient, key)
          if (new URLSearchParams(window.location.search).get('open') === id)
            doClose()
          notify({
            tone: 'error',
            text: t('collection:message.removed', words),
            scope: key,
          })
        } else if (field && !field.quiet) {
          notify({
            tone: 'error',
            text: t('collection:message.notSaved', words),
            action: {
              label: t('collection:message.retry'),
              run: () => void saveChange(record, patch, field).catch(() => {}),
            },
            scope: recordScope(id),
            key: valueKey,
          })
        }
        throw refusal
      }
    },
    [source, getId, key, context, queryClient, nameOf, recordScope, doClose, t],
  )
  /** A value the definition refused: it went back; the message says why. */
  const report = useCallback(
    (record: T, field: string, reason: string) =>
      notify({
        tone: 'error',
        text: t('collection:message.putBack', { reason }),
        scope: recordScope(getId(record)),
        key: `${key}:${getId(record)}:${field}`,
      }),
    [t, recordScope, getId, key],
  )

  // A new record (spec 7.5): ?new=1 in the address; its input waits in the tab.
  const isNew = useSearchParams().get('new') === '1'
  const [discarding, setDiscarding] = useState(false)
  const hasDraft = useCallback(() => {
    try {
      return sessionStorage.getItem(newRecordKey(key)) !== null
    } catch {
      return false
    }
  }, [key])
  const startNew = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    const wasOpen = params.has('open') || params.has('new')
    params.delete('open')
    params.set('new', '1')
    setSearchParams(params, {
      replace: wasOpen,
      state: wasOpen ? entryState() : { panel: panelMark },
    })
  }, [panelMark])

  // Closing with a description not saved yet asks first (spec 7.6): its text waits in the tab.
  const [leaving, setLeaving] = useState(false)
  const close = useCallback(() => {
    const unsaved = (() => {
      try {
        // The description and every rich text value keep unsaved text here.
        const prefix = `intervio.collection.${key}.${openId}.`
        return (
          Object.keys(sessionStorage).find((name) => name.startsWith(prefix)) ??
          null
        )
      } catch {
        return null
      }
    })()
    if (unsaved !== null) setLeaving(true)
    else if (isNew && hasDraft()) setDiscarding(true)
    else doClose()
  }, [key, openId, doClose, isNew, hasDraft])

  // More actions (spec 7.4): open full page, copy link, then the collection's actions.
  const listPath = basePath ?? `/${key}`
  const path = usePath()
  const pageId = path.startsWith(`${listPath}/`)
    ? decodeURIComponent(path.slice(listPath.length + 1))
    : null
  const [pending, setPending] = useState<{
    action: ActionDefinition
    record: T
  } | null>(null)
  const allowedActions = useCallback(
    (record: T) =>
      (definition.actions ?? []).filter(
        (action) =>
          !rights ||
          (rights(record, context as C).actions ?? []).includes(action.id),
      ),
    [definition.actions, rights, context],
  )
  const menuActions = useCallback(
    (record: T, onPage: boolean): MenuAction[] => [
      ...(onPage ? [] : [{ id: 'full', label: t('collection:actions.full') }]),
      { id: 'copy', label: t('collection:actions.copy') },
      ...allowedActions(record).map((action) => ({
        id: action.id,
        label: t(action.label),
        danger: true,
      })),
    ],
    [allowedActions, t],
  )
  const runMenu = useCallback(
    (id: string, record: T) => {
      const recordId = getId(record)
      if (id === 'full') navigate(`${listPath}/${encodeURIComponent(recordId)}`)
      else if (id === 'copy') {
        const link = `${window.location.origin}${listPath}?open=${encodeURIComponent(recordId)}`
        const scope = recordScope(recordId)
        Promise.resolve(navigator.clipboard?.writeText(link))
          .then(() => {
            if (!navigator.clipboard) throw new Error('no clipboard')
            notify({
              tone: 'confirm',
              text: t('collection:message.copied'),
              scope,
            })
          })
          .catch(() =>
            notify({
              tone: 'error',
              text: t('collection:message.notCopied'),
              scope,
            }),
          )
      } else {
        const action = (definition.actions ?? []).find((a) => a.id === id)
        if (action) setPending({ action, record })
      }
    },
    [getId, listPath, recordScope, t, definition.actions],
  )
  async function runAction(action: ActionDefinition, record: T) {
    const recordId = getId(record)
    try {
      const run = action.id === 'archive' ? source.archive : source.remove
      if (!run) throw new Error(`${key} cannot ${action.id}`)
      await run(recordId, context as C)
      cache.removed(queryClient, key, recordId, getId)
      if (pageId) navigate(listPath, { replace: true })
      else if (openId === recordId) doClose()
    } catch {
      // The panel may be closed by now: the message belongs to the collection.
      notify({
        tone: 'error',
        text: t(`collection:message.${action.id}Failed`, {
          name: nameOf(record),
        }),
        action: {
          label: t('collection:message.retry'),
          run: () => void runAction(action, record),
        },
        scope: key,
      })
    }
  }
  function confirmAction() {
    if (!pending) return
    setPending(null)
    void runAction(pending.action, pending.record)
  }
  const newDefaults = useCallback((): Partial<T> => {
    const values = {
      ...definition.create?.defaults(context as C),
    } as Partial<T>
    for (const filter of definition.filters ?? []) {
      const chosen = listing.filters[filter.id] ?? []
      if (chosen.length === 1 && filter.patch)
        Object.assign(values, filter.patch(chosen[0]))
    }
    return values
  }, [definition.create, definition.filters, listing.filters, context])
  const createRecord = useCallback(
    async (draft: Partial<T>) => {
      if (!source.create) throw new Error(`${key} cannot be created`)
      const created = await source.create(draft, context as C)
      const createdId = getId(created)
      cache.created(queryClient, keys.list(key, context, state.query), created)
      const params = new URLSearchParams(window.location.search)
      params.delete('new')
      params.set('open', createdId)
      setSearchParams(params, { replace: true, state: entryState() })
      notify({
        tone: 'confirm',
        text: t('collection:message.created'),
        action: {
          label: t('collection:message.undo'),
          run: () => {
            Promise.resolve(source.remove?.(createdId, context as C))
              .then(() => {
                cache.removed(queryClient, key, createdId, getId)
                if (
                  new URLSearchParams(window.location.search).get('open') ===
                  createdId
                )
                  doClose()
              })
              .catch(() =>
                notify({
                  tone: 'error',
                  text: t('collection:message.removeFailed', {
                    name: nameOf(created),
                  }),
                  scope: key,
                }),
              )
          },
        },
        scope: key,
      })
    },
    [source, key, context, getId, queryClient, state.query, t, doClose, nameOf],
  )
  const unavailable = useCallback(
    (id: Id) =>
      cache.removed(queryClient, key, id, getId, { keepRecord: true }),
    [queryClient, key, getId],
  )
  const panelOpen = Boolean(definition.panel && (openId || isNew))
  const canCreate = Boolean(
    definition.create && definition.panel && source.create,
  )

  /** With the panel open, ↑ and ↓ open the previous or next record; Escape closes it. */
  function onKeyDown(event: KeyboardEvent) {
    if (!panelOpen || event.defaultPrevented) return
    const target = event.target as HTMLElement
    if (target.closest('input, textarea, [role="menu"], [role="dialog"]'))
      return
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (!openId || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp'))
      return
    const index = list.items.findIndex((item) => getId(item) === openId)
    const next = list.items[index + (event.key === 'ArrowDown' ? 1 : -1)]
    if (next) {
      event.preventDefault()
      open(getId(next))
    }
  }

  const { fetchNextPage } = list
  const listAddress = writeListing(new URLSearchParams(), listing).toString()
  const scrollMemory = useMemo(
    () => ({ key: `intervio.collection.${key}.scroll`, address: listAddress }),
    [key, listAddress],
  )
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage])
  const more: More = {
    canLoadMore:
      list.hasNextPage &&
      !list.isFetchingNextPage &&
      !list.isFetchNextPageError,
    loadMore,
    hasMore: list.hasNextPage && !list.isFetchNextPageError,
    pages: list.data?.pages.length ?? 0,
    memory: scrollMemory,
  }

  // "12 of 42 items" needs the collection's whole total: one small cached request.
  const all = useQuery({
    queryKey: [definition.key, 'total', context ?? null],
    queryFn: async () =>
      (
        await definition.source.list(
          {
            search: '',
            filters: {},
            sort: definition.defaultSort,
            cursor: null,
          },
          context as C,
        )
      ).total,
    enabled: narrowed,
  })

  const count =
    list.total === undefined
      ? t('collection:countUnknown', { count: list.items.length })
      : narrowed && all.data !== undefined
        ? t('collection:narrowedCount', {
            shown: list.total,
            all: t(definition.i18n.count, { count: all.data }),
          })
        : t(definition.i18n.count, { count: list.total })

  // Layout (spec 9): the room for the list and the panel, the panel's width, the mode.
  const mode = useLayoutMode()
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const [space, setSpace] = useState(0)
  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const measure = () => setSpace(section.getBoundingClientRect().width)
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(section)
    return () => observer.disconnect()
  }, [pageId])
  const widthKey = `intervio.collection.${key}.panelWidth`
  const [dragged, setDragged] = useState<number | null>(null)
  const panelShown = Boolean(definition.panel && (openId || isNew))
  // Each opening starts from the saved width, in its reasonable range (9.1).
  const [wasShown, setWasShown] = useState(panelShown)
  if (wasShown !== panelShown) {
    setWasShown(panelShown)
    if (!panelShown) setDragged(null)
  }
  const saved = (() => {
    try {
      return Number(localStorage.getItem(widthKey)) || PANEL.default
    } catch {
      return PANEL.default
    }
  })()
  const panelWidth = space
    ? clampPanel(dragged ?? openingWidth(saved, space), space)
    : PANEL.default
  const commitWidth = useCallback(
    (width: number) => {
      try {
        localStorage.setItem(widthKey, String(Math.round(width)))
      } catch {
        // not remembered: the next panel opens at 560 px
      }
    },
    [widthKey],
  )
  // Medium width: the sidebar folds while a panel is open (spec 9).
  useEffect(() => {
    foldSidebar(mode === 'medium' && panelShown)
    return () => foldSidebar(false)
  }, [mode, panelShown])
  // The table's columns: as many as fit, in the collection's priority (spec 9).
  const listWidth =
    (panelShown && mode !== 'narrow' ? space - panelWidth - 8 : space) - 24
  const priority =
    definition.columnPriority ?? definition.columns.map((column) => column.id)
  // The same ids keep the same array, so the table's columns (and the fields being
  // edited in them) are not rebuilt on every render.
  const shownKey = (
    space
      ? priority.slice(0, Math.max(1, Math.floor(listWidth / PANEL.column)))
      : priority
  ).join(',')
  const shownColumns = useMemo(() => shownKey.split(','), [shownKey])
  const narrowPanel = mode === 'narrow' && panelShown
  const back = narrowPanel ? t(definition.i18n.title) : undefined

  const dialogs = (
    <>
      <ConfirmDialog
        open={pending !== null}
        title={pending ? t(pending.action.confirm.title) : ''}
        text={pending ? t(pending.action.confirm.text) : ''}
        confirm={pending ? t(pending.action.confirm.button) : ''}
        cancel={t('collection:actions.cancel')}
        danger
        onConfirm={() => void confirmAction()}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={leaving}
        title={t('collection:description.unsavedTitle')}
        text={t('collection:description.unsavedText')}
        confirm={t('collection:description.leave')}
        cancel={t('collection:description.keepEditing')}
        onConfirm={() => {
          setLeaving(false)
          doClose()
        }}
        onCancel={() => setLeaving(false)}
      />
      <ConfirmDialog
        open={discarding}
        title={t('collection:create.discardTitle')}
        text={t('collection:create.discardText')}
        confirm={t('collection:create.discard')}
        cancel={t('collection:description.keepEditing')}
        danger
        onConfirm={() => {
          setDiscarding(false)
          try {
            sessionStorage.removeItem(newRecordKey(key))
          } catch {
            // storage blocked: nothing kept
          }
          doClose()
        }}
        onCancel={() => setDiscarding(false)}
      />
    </>
  )

  if (pageId && definition.panel)
    return (
      <>
        <RecordPage
          key={pageId}
          definition={definition}
          panel={definition.panel}
          context={context as C}
          id={pageId}
          listHref={`${listPath}?open=${encodeURIComponent(pageId)}`}
          canEdit={canEdit}
          save={save}
          report={report}
          actions={(record) => menuActions(record, true)}
          onAction={runMenu}
        />
        {dialogs}
      </>
    )

  return (
    <section
      ref={sectionRef}
      aria-labelledby={`${definition.key}-title`}
      onKeyDown={onKeyDown}
      className="flex h-[calc(100dvh-5.5rem)] min-h-[360px] lg:h-[calc(100dvh-3rem)]"
    >
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-4 pe-6',
          narrowPanel && 'hidden',
        )}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <h1 id={`${definition.key}-title`} className="text-xl font-medium">
            {t(definition.i18n.title)}
          </h1>
          <span aria-live="polite" className="text-muted">
            {list.data ? count : null}
          </span>
          <Show as="span" when={canCreate} className="ms-auto">
            <Button look="primary" onPress={startNew}>
              {definition.create ? t(definition.create.add) : null}
            </Button>
          </Show>
        </div>

        <Show when={narrowed || list.items.length > 0}>
          <Toolbar
            namespace={definition.i18n.namespace}
            filters={definition.filters ?? []}
            listing={listing}
            onSearch={state.setSearch}
            onFilter={state.setFilter}
            onClear={state.clear}
          />
        </Show>

        <div
          ref={scrollRef}
          className="scroll-quiet min-h-0 flex-1 overflow-y-auto [--scroll-quiet-top:2rem]"
        >
          <Switch>
            <Match when={list.isPending}>
              <Placeholders />
            </Match>
            <Match when={list.isError && !list.data}>
              <div
                role="alert"
                className="flex flex-col items-start gap-2 py-8"
              >
                <p>{t('collection:error.list')}</p>
                <Button look="secondary" onPress={() => list.refetch()}>
                  {t('collection:error.retry')}
                </Button>
              </div>
            </Match>
            <Match when={list.items.length === 0 && narrowed}>
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <h2 className="text-lg font-medium">
                  {t('collection:noResults.title')}
                </h2>
                <Button look="secondary" onPress={state.clear}>
                  {t('collection:noResults.clear')}
                </Button>
              </div>
            </Match>
            <Match when={list.items.length === 0}>
              <div className="flex flex-col items-center gap-1 py-16 text-center">
                <h2 className="text-lg font-medium">
                  {t(definition.i18n.empty.title)}
                </h2>
                <p className="text-muted">{t(definition.i18n.empty.text)}</p>
                <Show when={canCreate} className="mt-3">
                  <Button look="primary" onPress={startNew}>
                    {definition.create ? t(definition.create.add) : null}
                  </Button>
                </Show>
              </div>
            </Match>
            <Match when={list.items.length > 0}>
              <RecordTable
                definition={definition}
                items={list.items}
                total={list.total}
                label={t(definition.i18n.title)}
                scrollRef={scrollRef}
                more={more}
                sort={listing.sort}
                onSort={state.setSort}
                save={save}
                report={report}
                canEdit={canEdit}
                openId={definition.panel ? openId : null}
                shown={shownColumns}
                onOpen={definition.panel ? open : undefined}
              />
            </Match>
          </Switch>
          <Show when={list.isFetchingNextPage}>
            <Placeholders rows={2} />
          </Show>
          <Show when={list.isFetchNextPageError && !list.isFetchingNextPage}>
            <div
              role="alert"
              className="flex items-center gap-3 border-b border-border px-3 py-3"
            >
              <span>{t('collection:error.more')}</span>
              <Button size="sm" look="secondary" onPress={loadMore}>
                {t('collection:error.retry')}
              </Button>
            </div>
          </Show>
        </div>
      </div>

      {panelShown && !narrowPanel && (
        <PanelDivider
          width={panelWidth}
          {...panelLimits(space)}
          label={t('collection:panel.resize')}
          onChange={setDragged}
          onCommit={commitWidth}
        />
      )}
      {panelShown && (
        <motion.div
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
          style={narrowPanel ? undefined : { width: panelWidth }}
          className={cn(
            'h-full shrink-0',
            narrowPanel &&
              'flex-1 [&>aside]:border-0 [&>aside]:ps-0 [&>aside]:pe-0',
          )}
        >
          <Switch className="h-full">
            <Match when={isNew && !openId}>
              <NewRecord
                back={back}
                key="new"
                definition={definition}
                panel={definition.panel!}
                defaults={newDefaults()}
                onCreated={createRecord}
                onClose={close}
              />
            </Match>
            <Match when={openId}>
              {(id) => (
                <RecordPanel
                  key={definition.key}
                  back={back}
                  definition={definition}
                  panel={definition.panel!}
                  context={context as C}
                  id={id}
                  fromList={list.items.find((item) => getId(item) === id)}
                  onClose={close}
                  onUnavailable={unavailable}
                  canEdit={canEdit}
                  save={save}
                  report={report}
                  actions={(record) => menuActions(record, false)}
                  onAction={runMenu}
                />
              )}
            </Match>
          </Switch>
        </motion.div>
      )}
      {dialogs}
    </section>
  )
}

/**
 * The table's features: none. Sorting is done by the server from the address, so the
 * headers change the address directly; the columns that fit are chosen before.
 */
const features = tableFeatures({})

/**
 * The table, on TanStack Table's model. Only the drawn rows are in the page; an empty
 * row above and below them keeps the table's real height, so it stays a real table.
 */
function RecordTable<T extends RowData, C>({
  definition,
  items,
  total,
  label,
  scrollRef,
  more,
  sort,
  onSort,
  save,
  report,
  canEdit,
  openId,
  onOpen,
  shown,
}: {
  definition: CollectionDefinition<T, C>
  items: T[]
  total: number | undefined
  label: string
  scrollRef: RefObject<HTMLDivElement | null>
  more: More
  /** The sort chosen, or null for the default order (no header marked). */
  sort: ListQuery['sort'] | null
  onSort: (sort: ListQuery['sort'] | null) => void
  save: SaveChange<T>
  report: ReportInvalid<T>
  canEdit: (record: T, id: string) => boolean
  /** The record open in the panel: its row is marked. */
  openId: Id | null
  /** Set when a row opens its record in the panel. */
  onOpen?: (id: Id) => void
  /** The ids of the columns that fit, by priority. */
  shown: string[]
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const columns = useMemo<ColumnDef<typeof features, T>[]>(
    () =>
      definition.columns
        .filter((column) => shown.includes(column.id))
        .map((column: ColumnDefinition<T>) => ({
          id: column.id,
          header: () => t(column.label),
          cell: (info) => (
            <ValueField
              record={info.row.original}
              field={column.field}
              allowed={canEdit(info.row.original, column.id)}
              read={column.cell}
              label={t(column.label)}
              namespace={definition.i18n.namespace}
              save={(patch) =>
                save(info.row.original, patch, { label: t(column.label) })
              }
              onInvalid={(reason) =>
                report(info.row.original, t(column.label), reason)
              }
              look="cell"
            />
          ),
        })),
    [
      definition.columns,
      definition.i18n.namespace,
      t,
      save,
      report,
      canEdit,
      shown,
    ],
  )
  const table = useTable({
    features,
    columns,
    data: items,
    getRowId: (record) => definition.getId(record),
  })
  const rows = table.getRowModel().rows
  const virtualizer = useCollectionList({
    scrollRef,
    count: rows.length,
    estimateSize: 49,
    ...more,
  })
  const drawn = virtualizer.getVirtualItems()
  const before = drawn[0]?.start ?? 0
  const after = drawn.length
    ? virtualizer.getTotalSize() - drawn[drawn.length - 1].end
    : 0
  const byId = new Map(definition.columns.map((column) => [column.id, column]))

  // The open record's row stays in view (after ↑ / ↓, or a link).
  const openIndex = openId ? rows.findIndex((row) => row.id === openId) : -1
  useEffect(() => {
    if (openIndex >= 0) virtualizer.scrollToIndex(openIndex, { align: 'auto' })
  }, [openIndex, virtualizer])

  /**
   * Three clicks on a header: its first direction, then reversed, then back to the
   * collection's default order (which removes the sort from the address).
   */
  function sortBy(column: ColumnDefinition<T>) {
    const first = column.sort ?? 'asc'
    if (sort?.by !== column.id) onSort({ by: column.id, direction: first })
    else if (sort.direction === first)
      onSort({ by: column.id, direction: first === 'asc' ? 'desc' : 'asc' })
    else onSort(null)
  }

  return (
    <table
      aria-label={label}
      aria-rowcount={(total ?? items.length) + 1}
      className="w-full table-fixed border-collapse text-start"
    >
      <thead className="sticky top-0 z-10 bg-background">
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id} aria-rowindex={1}>
            {group.headers.map((header) => {
              const column = byId.get(header.column.id)!
              const sorted = sort?.by === column.id ? sort.direction : null
              return (
                <th
                  key={header.id}
                  scope="col"
                  aria-sort={
                    sorted === 'asc'
                      ? 'ascending'
                      : sorted === 'desc'
                        ? 'descending'
                        : column.sort
                          ? 'none'
                          : undefined
                  }
                  style={{ width: column.width }}
                  className="h-8 px-3 text-start align-middle text-xs font-normal text-muted shadow-[inset_0_-1px_0_var(--foreground)]"
                >
                  <Show
                    as="span"
                    when={column.sort}
                    fallback={<table.FlexRender header={header} />}
                  >
                    <button
                      type="button"
                      aria-label={t('collection:sortBy', {
                        column: t(column.label),
                      })}
                      onClick={() => sortBy(column)}
                      className={cn(
                        '-mx-1 flex items-center gap-1 rounded-[var(--field-radius)] px-1 hover:text-foreground',
                        sorted && 'text-foreground',
                      )}
                    >
                      <table.FlexRender header={header} />
                      <Icon
                        name={
                          sorted === 'asc'
                            ? 'lucide/arrow-up'
                            : sorted === 'desc'
                              ? 'lucide/arrow-down'
                              : 'lucide/arrow-up-down'
                        }
                        size={12}
                      />
                    </button>
                  </Show>
                </th>
              )
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {before > 0 && (
          <tr aria-hidden style={{ height: before }}>
            <td colSpan={columns.length} />
          </tr>
        )}
        {drawn.map((virtual) => {
          const row = rows[virtual.index]
          return (
            <tr
              key={row.id}
              data-index={virtual.index}
              ref={virtualizer.measureElement}
              aria-rowindex={virtual.index + 2}
              aria-current={row.id === openId ? 'true' : undefined}
              tabIndex={onOpen ? 0 : undefined}
              onClick={(event) => {
                // An editable cell edits; anywhere else on the row opens the record.
                const target = event.target as HTMLElement
                if (!onOpen || target.closest('input, button, a')) return
                onOpen(row.id)
              }}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  event.target === event.currentTarget
                )
                  onOpen?.(row.id)
              }}
              className={cn(
                'group border-b border-border outline-none',
                onOpen && 'cursor-pointer focus-visible:bg-default',
                row.id === openId &&
                  'bg-default shadow-[inset_3px_0_0_var(--foreground)]',
              )}
            >
              {row.getAllCells().map((cell, index) => (
                <td key={cell.id} className="truncate px-3 py-3 align-middle">
                  <Show
                    as="span"
                    className="block min-w-0 truncate"
                    when={index === 0 && onOpen}
                    fallback={<table.FlexRender cell={cell} />}
                  >
                    {(openRecord) => (
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1">
                          <table.FlexRender cell={cell} />
                        </span>
                        {/* Shown on the row under the pointer or the focus: opens the record. */}
                        <button
                          type="button"
                          aria-label={t('collection:panel.openRecord', {
                            name: definition.panel?.title(row.original) ?? '',
                          })}
                          onClick={() => openRecord(row.id)}
                          className="-my-1 flex shrink-0 cursor-pointer items-center rounded-[var(--field-radius)] bg-default p-1.5 text-muted opacity-0 outline-none group-hover:opacity-100 group-focus-within:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-foreground"
                        >
                          <Icon name="lucide/chevron-right" size={16} />
                        </button>
                      </span>
                    )}
                  </Show>
                </td>
              ))}
            </tr>
          )
        })}
        {after > 0 && (
          <tr aria-hidden style={{ height: after }}>
            <td colSpan={columns.length} />
          </tr>
        )}
      </tbody>
    </table>
  )
}

/** Grey rows where records will be: six on the first load, two while more load. */
function Placeholders({ rows = 6 }: { rows?: number }) {
  const { t } = useTranslation('collection')
  const bar = 'rounded-[var(--field-radius)] bg-default'
  return (
    <div role="status" aria-label={t('loading')} className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border px-3 py-4"
        >
          <span className={cn(bar, 'h-4 w-48')} />
          <span className={cn(bar, 'h-4 w-20')} />
          <span className={cn(bar, 'h-4 w-28')} />
        </div>
      ))}
    </div>
  )
}
