import { ChevronRight } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useCallback,
  useEffect,
  memo,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { addTranslations } from '../i18n'
import { dismissScope } from '../notifications'
import {
  currentAddress,
  currentSearch,
  entryState,
  navigate,
  usePath,
  useQueryStates,
} from '../navigation'
import {
  Button,
  Cell,
  cn,
  Column,
  foldSidebar,
  offerBack,
  Match,
  Row,
  RowCollection,
  Show,
  Switch,
  Table,
  TableBody,
  TableHeader,
  TableLayout,
  TableLoadMoreItem,
  Virtualizer,
} from '../ui-kit'
import { cache, keys, useCollectionQuery } from './data/collectionQuery'
import { useRecordActions } from './data/recordActions'
import { useRecordChanges } from './data/recordChanges'
import { confirm } from './confirm/confirm'
import type { CollectionDefinition, ColumnDefinition } from './definition'
import { listPathOf } from './definition'
import en from './locales/en.json'
import fr from './locales/fr.json'
import { RecordPage } from './record/RecordPage'
import {
  COLUMN_WIDTH,
  ROW_HEIGHT,
  panelLimits,
  useLayoutMode,
} from './layout/layout'
import { NewRecord } from './create/NewRecord'
import { PanelDivider } from './layout/PanelDivider'
import { RecordPanel } from './record/RecordPanel'
import { newRecordKey } from './record/recordQuery'
import { RecordRows } from './list/RecordRows'
import { readBookmark, useScrollBookmark } from './list/scrollBookmark'
import { Toolbar } from './list/Toolbar'
import { SelectionBar } from './selection/SelectionBar'
import { useSelection } from './selection/useSelection'
import { useHeldOrder } from './list/useHeldOrder'
import { usePanelWidth } from './layout/usePanelWidth'
import { isShared, SharedNote } from './selection/sharedEdit'
import { Awake, useHandFocus } from './values/awake'
import { Folds, type Fold } from './drill/Folded'
import { currentViews } from './drill/viewStack'
import { OpenLinked, type Step } from './record/linked'
import { panelAddress, panelParsers, readPanel } from './address'
import { LinkedPanel } from './record/LinkedPanel'
import { useChain } from './record/linked'
import { LinkedTabs } from './record/LinkedTabs'
import {
  MarksProvider,
  useMark,
  useMarks,
  useMarksStore,
  type MarksStore,
} from './list/rowMarks'
import type { Id, ReportInvalid, SaveChange, Sort } from './types'
import { filterFields, nextSort, ruleKeys } from './listing/rules'
import { ValueField } from './values/ValueField'
import { isNarrowed, useCollectionState } from './list/useCollectionState'

addTranslations('collection', { en, fr })

/**
 * The panel's parameters as the address has them now. The panel's callbacks read them
 * when they run, not from the last render: one click can call them several times
 * before a render (a row's press, then its action), and they stay the same from one
 * record to the next, so rows don't render again.
 */
const current = () => readPanel(currentSearch())

/** What the list parts need from the query to load more (spec 8.1). */
type More = {
  canLoadMore: boolean
  loadMore: () => void
  /** The next page is loading. */
  loading: boolean
  hasMore: boolean
}

/**
 * A collection screen (spec 4–5): the list of one kind of record, as a table (other
 * views come later).
 * It knows nothing about the records; the definition says how to fetch and show them.
 * It fills the screen's height, and only its list scrolls (spec 8.1).
 */
export function Collection<T, C = void>({
  definition,
  context,
  basePath: basePathProp,
}: {
  definition: CollectionDefinition<T, C>
  context?: C
  /**
   * The list's address (spec 12, 13); a record's full page is {basePath}/{id}.
   * Defaults to the definition's, else /{definition.key}.
   */
  basePath?: string
}) {
  const basePath = basePathProp ?? listPathOf(definition, context as C)
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const scrollRef = useRef<HTMLDivElement>(null)
  // What the Filter menu offers, and each rule's f.{key} in the address (decision 149).
  const fields = useMemo(() => filterFields(definition), [definition])
  const state = useCollectionState(definition.key, definition.defaultSort, {
    filters: [
      ...ruleKeys(fields),
      ...(definition.scopes ?? []).map((scope) => scope.id),
    ],
    kept: definition.scopes?.map((scope) => scope.id),
  })
  const { listing } = state
  const narrowed = isNarrowed(listing)
  // Where the tab left this list (spec 8.4): it starts at that page, for the list it
  // reopens on only (another search, filter or sort starts at the top).
  const listKey = JSON.stringify(state.query)
  const [opened] = useState(() => ({
    list: listKey,
    page: readBookmark(definition.key, listKey)?.page ?? null,
  }))
  const list = useCollectionQuery({
    key: definition.key,
    source: definition.source,
    context: context as C,
    listing: state.query,
    start: listKey === opened.list ? opened.page : null,
  })
  // Saves a change made in place, then shows the saved record everywhere (spec 8.3).
  const queryClient = useQueryClient()
  const { source, getId, key } = definition

  // Every change to a record goes through the shared record actions (spec 8.3).
  const actions = useRecordActions(definition, context as C, basePath)
  const { canEdit, save, report } = actions
  // The panel's address (spec 6.3, 7.1, decision 137): the record open (?open=), a new
  // one (?new=1), the linked records opened after it (?linked=key:id,…).
  const [panel] = useQueryStates(panelParsers)
  const openId = panel.open
  const chain = panel.linked
  const isNew = panel.new === '1'
  // Each record on the way, with its collection and context (notice 3).
  const linkedChain = useChain(definition, context, openId ?? null, chain)
  const panelMark = `panel:${key}`
  /**
   * Changes the panel's parameters at once (nuqs's own updates wait a moment), with an
   * entry that carries this screen's marks, which nuqs can't set: pushed, or replacing
   * the current one. The entry keeps its place in a drill-down (spec 12.1).
   */
  const mark = useCallback(
    (
      values: Parameters<typeof panelAddress>[1],
      state: Record<string, unknown>,
      replace = false,
    ) => {
      const drill = entryState().drill
      navigate(panelAddress(currentAddress(), values), {
        replace,
        state: { ...(drill === undefined ? {} : { drill }), ...state },
      })
    },
    [],
  )
  const open = useCallback(
    (id: Id) => {
      const wasOpen = current().open
      if (wasOpen === id) return
      // Another record from the list: no linked ones after it. Opening pushes an
      // entry (Back closes); switching records replaces it.
      if (wasOpen)
        mark(
          { open: id, linked: null },
          { ...entryState(), linkedStep: false },
          true,
        )
      else mark({ open: id, linked: null }, { panel: panelMark })
    },
    [mark, panelMark],
  )

  /** Shows the chain cut to this many steps (0: the record opened from the list). */
  const showChain = useCallback(
    (next: Step[]) => mark({ linked: next }, entryState(), true),
    [mark],
  )
  /** A section's record opens in the panel; Back returns to the one before. */
  const openLinked = useCallback(
    (collectionKey: string, id: Id) =>
      mark(
        { linked: [...current().linked, { key: collectionKey, id }] },
        { ...entryState(), linkedStep: true },
      ),
    [mark],
  )
  /** "‹ {collection}" on a narrow screen: the list, whatever the depth. */
  const leave = useCallback(
    () => mark({ open: null, linked: null }, entryState(), true),
    [mark],
  )
  /**
   * Back to the chain cut to this depth (a tab, or × one step): through the browser's
   * history when the steps were pushed, so Back never meets a stale entry after it.
   */
  // ponytail: assumes each step after the first linked one was pushed (openLinked
  // does); a chain from a link (the address alone) has no entries, so it is replaced.
  const stepTo = useCallback(
    (depth: number) => {
      const steps = current().linked.length - depth
      if (steps <= 0) return
      if (entryState().linkedStep === true) window.history.go(-steps)
      else showChain(current().linked.slice(0, depth))
    },
    [showChain],
  )
  /** × on a linked record: one step back, as Back does. */
  const stepBack = useCallback(
    () => stepTo(current().linked.length - 1),
    [stepTo],
  )
  const doClose = useCallback(() => {
    if (entryState().panel === panelMark) window.history.back()
    else mark({ open: null }, entryState(), true)
  }, [panelMark, mark])

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
  // More actions (spec 7.4) and the full page: the record's own address.
  const listPath = basePath ?? `/${key}`
  const path = usePath()
  const pageId = path.startsWith(`${listPath}/`)
    ? decodeURIComponent(path.slice(listPath.length + 1))
    : null
  useEffect(() => {
    const scope = pageId ? recordScope(pageId) : null
    return () => {
      if (scope) dismissScope(scope)
    }
  }, [pageId, recordScope])

  // A new record (spec 7.5): ?new=1 in the address; its input waits in the tab.
  const hasDraft = useCallback(() => {
    try {
      return sessionStorage.getItem(newRecordKey(key)) !== null
    } catch {
      return false
    }
  }, [key])
  const startNew = useCallback(() => {
    const wasOpen = Boolean(current().open || current().new)
    mark(
      { open: null, new: '1' },
      wasOpen ? entryState() : { panel: panelMark },
      wasOpen,
    )
  }, [mark, panelMark])

  // Closing with a description not saved yet asks first (spec 7.6): its text waits in the tab.
  const close = useCallback(async () => {
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
    if (unsaved !== null) {
      const leave = await confirm({
        title: t('collection:description.unsavedTitle'),
        text: t('collection:description.unsavedText'),
        button: t('collection:description.leave'),
        cancel: t('collection:description.keepEditing'),
      })
      if (leave) doClose()
    } else if (isNew && hasDraft()) {
      const discard = await confirm({
        title: t('collection:create.discardTitle'),
        text: t('collection:create.discardText'),
        button: t('collection:create.discard'),
        cancel: t('collection:description.keepEditing'),
        danger: true,
      })
      if (!discard) return
      try {
        sessionStorage.removeItem(newRecordKey(key))
      } catch {
        // storage blocked: nothing kept
      }
      doClose()
    } else doClose()
  }, [key, openId, doClose, isNew, hasDraft, t])

  /** "3 items": the collection's own words for a number of its records. */
  const countOf = (count: number) => t(definition.i18n.count, { count })
  // Several records selected (spec 8.5): only when the collection has actions for them.
  // Narrow screens (decision 121): rows that open their record; no selection.
  const narrowScreen = useLayoutMode() === 'narrow'
  // The tab remembers where the person was, and the pages above load on the way up.
  useScrollBookmark({
    key: definition.key,
    list: listKey,
    scrollRef,
    rowHeight: narrowScreen ? ROW_HEIGHT.rows : ROW_HEIGHT.table,
    pages: list.data?.pages,
    pageParams: list.pageParams,
    getId,
    previous: {
      has: list.hasPreviousPage,
      loading: list.isFetchingPreviousPage,
      load: () => void list.fetchPreviousPage(),
    },
  })
  const selectable = Boolean(definition.actions?.length) && !narrowScreen
  // The columns the Sort menu offers, with the direction each starts in.
  const sortables = useMemo(
    () =>
      definition.columns.flatMap((column) =>
        column.sort
          ? [{ id: column.id, label: column.label, first: column.sort }]
          : [],
      ),
    [definition],
  )
  // A new search, filter or sort clears the selection and sorts the list again.
  const view = JSON.stringify([listing.search, listing.filters, listing.sort])
  const { shownItems, outOfOrder, keptCount, keep, forget, release } =
    useHeldOrder(list.items, getId, view, openId)
  const { selected, select, drop, selectedRecords, bulkActions, saveShared } =
    useSelection({
      definition,
      actions,
      records: shownItems,
      view,
      nameOf,
      onCleared: release,
    })
  // A record changed anywhere (spec 8.3): one of this list's records changed
  // keeps its place; a removed one leaves the selection, and the panel, the page or
  // the linked record showing it closes.
  useRecordChanges((change) => {
    if (change.kind === 'updated' && change.key === key) {
      keep(change.id, change.record as T)
      return
    }
    if (change.kind !== 'removed') return
    const shown = current()
    const last = shown.linked.at(-1)
    const linkedShown = last?.key === change.key && last.id === change.id
    if (linkedShown) stepBack()
    if (change.key !== key) return
    forget(change.id)
    drop(change.id)
    if (pageId === change.id) navigate(listPath, { replace: true })
    else if (!linkedShown && shown.open === change.id)
      if (shown.linked.length) leave()
      else doClose()
  })
  const newDefaults = useCallback((): Partial<T> => {
    const values = {
      ...definition.create?.defaults(context as C),
    } as Partial<T>
    // A list filtered or scoped to one value creates records with it (spec 7.5, 12.1).
    for (const filter of [
      ...(definition.filters ?? []),
      ...(definition.scopes ?? []),
    ]) {
      const chosen = listing.filters[filter.id] ?? []
      if (chosen.length === 1 && filter.patch)
        Object.assign(values, filter.patch(chosen[0]))
    }
    return values
  }, [
    definition.create,
    definition.filters,
    definition.scopes,
    listing.filters,
    context,
  ])
  const createRecord = useCallback(
    async (draft: Partial<T>, latest: () => Partial<T>) => {
      const created = await actions.create(
        draft,
        keys.list(key, context, state.query),
      )
      mark({ new: null, open: getId(created) }, entryState(), true)
      // Values typed while it was being created: saved on it, not lost.
      const typed = latest()
      const later = Object.fromEntries(
        Object.entries(typed).filter(
          ([name, value]) => draft[name as keyof T] !== value,
        ),
      ) as Partial<T>
      if (Object.keys(later).length > 0)
        void actions.save(created, later).catch(() => {}) // a failure says so
    },
    [actions, key, context, getId, state.query, mark],
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
      if (chain.length) stepBack()
      else close()
      return
    }
    if (!openId || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp'))
      return
    const index = shownItems.findIndex((item) => getId(item) === openId)
    const next = shownItems[index + (event.key === 'ArrowDown' ? 1 : -1)]
    if (next) {
      event.preventDefault()
      open(getId(next))
    }
  }

  const { fetchNextPage } = list
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage])
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError } = list
  const more = useMemo<More>(
    () => ({
      canLoadMore: hasNextPage && !isFetchingNextPage && !isFetchNextPageError,
      loadMore,
      loading: isFetchingNextPage,
      hasMore: hasNextPage && !isFetchNextPageError,
    }),
    [hasNextPage, isFetchingNextPage, isFetchNextPageError, loadMore],
  )

  // Layout (spec 9): the room for the list and the panel, the panel's width, the mode.
  const mode = useLayoutMode()
  const reduceMotion = useReducedMotion()
  const panelShown = Boolean(definition.panel && (openId || isNew))
  const {
    sectionRef,
    space,
    width: panelWidth,
    setDragged,
    commit: commitWidth,
  } = usePanelWidth(key, panelShown, pageId)
  // The views this list was drilled from (spec 12.1): a strip each, after the sidebar.
  // Returning to one takes it and the views after it off the stack.
  const views: Fold[] = currentViews().map((view, index) => ({
    name: view.name,
    open: () => navigate(view.address, { state: { drill: index } }),
  }))
  const strips = mode === 'narrow' ? [] : views
  const hasStrips = strips.length > 0
  // Narrow: no strips; the top bar's ‹ goes up one level, as the last strip would.
  const up = mode === 'narrow' ? views.at(-1) : undefined
  const upName = up?.name
  const upOpen = up?.open
  useEffect(() => {
    if (!upName || !upOpen) return
    return offerBack({
      label: t('collection:folds.back', { name: upName }),
      run: upOpen,
    })
    // A new function each render: the address and the name say which view it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upName, t])
  // Medium width: the sidebar folds while a panel or a strip shows (spec 9, 12.1).
  useEffect(() => {
    foldSidebar(mode === 'medium' && (panelShown || hasStrips))
    return () => foldSidebar(false)
  }, [mode, panelShown, hasStrips])
  const narrowPanel = mode === 'narrow' && panelShown
  const back = narrowPanel ? t(definition.i18n.title) : undefined

  // What the rows show besides their record (the open one, the selection), read from
  // a store: a change renders only the rows concerned, never the table (spec 8, 9).
  // Each row's number (decision 150): its place in the list as shown.
  const positions = useMemo(
    () =>
      new Map(shownItems.map((record, index) => [getId(record), index + 1])),
    [shownItems, getId],
  )
  const marksStore = useMarksStore({
    openId: definition.panel ? openId : null,
    selected,
    note: t('collection:selection.appliesTo', {
      what: countOf(selectedRecords.length),
    }),
    saveShared,
    positions,
  })
  const selection = useMemo(
    () => (selectable ? { keys: selected, onChange: select } : undefined),
    [selectable, selected, select],
  )
  // The open record's row stays in view (after ↑ / ↓, or a link).
  useEffect(() => {
    if (!openId) return
    scrollRef.current
      ?.querySelector(`[data-key="${CSS.escape(openId)}"]`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [openId])

  if (pageId && definition.panel)
    return (
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
        actions={(record) => actions.menu(record, true)}
        onAction={actions.runMenu}
      />
    )

  return (
    <section
      ref={sectionRef}
      aria-labelledby={`${definition.key}-title`}
      onKeyDown={onKeyDown}
      // The list and the panel take the window's full height and reach its right edge:
      // the layout's padding on the top, right and bottom is cancelled, and each of
      // them has its own top spacing (the list here, the panel in its top bar).
      className="relative -mt-4 -me-4 -mb-4 flex h-[calc(100dvh-3.5rem)] min-h-[360px] overflow-hidden lg:-mt-6 lg:-me-6 lg:-mb-6 lg:h-dvh"
    >
      {/* Right after the sidebar, before the list. */}
      <Show when={hasStrips} className="me-4 h-full lg:me-6">
        <Folds folds={strips} kind="views" />
      </Show>
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-4 pe-6 pt-4 lg:pt-6',
          narrowPanel && 'hidden',
        )}
      >
        {/* One row: the title, the search and filters (or the selection), then Add. */}
        <div className="flex flex-wrap items-center gap-2">
          <h1
            id={`${definition.key}-title`}
            className="me-2 text-base font-medium"
          >
            {t(definition.i18n.title)}
          </h1>
          <Switch className="ms-auto min-w-0">
            <Match when={selectedRecords.length > 0}>
              <SelectionBar
                count={selectedRecords.length}
                actions={bulkActions}
                onClear={() => select(new Set())}
              />
            </Match>
            {/* Hidden only for a collection with no records at all (decision 119),
            not while a new sort or filter loads: it would blink, and close the
            narrow screen's Filters panel. */}
            <Match when={narrowed || list.items.length > 0 || !list.isSuccess}>
              <Toolbar
                namespace={definition.i18n.namespace}
                fields={fields}
                sortables={sortables}
                scopes={definition.scopes}
                listing={listing}
                onSearch={state.setSearch}
                onFilters={state.setFilters}
                onSort={state.setSort}
                onClear={state.clear}
              />
            </Match>
          </Switch>
          {/* A changed record keeps its place until the list is sorted again (spec 8.6). */}
          <Show
            when={outOfOrder}
            className="flex items-center gap-3 text-muted"
          >
            {/* In the collection's words: "After a change, 2 items keep their place." */}
            <span aria-live="polite">
              {t('collection:held.text', {
                count: keptCount,
                what: countOf(keptCount),
              })}
            </span>
            <Button size="sm" onPress={release}>
              {t('collection:held.sort')}
            </Button>
          </Show>
          <Show as="span" when={canCreate}>
            <Button size="sm" look="primary" onPress={startNew}>
              {t('collection:new')}
            </Button>
          </Show>
        </div>

        {/* The table scrolls itself (React Aria's virtualized table). */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Its wrapper passes the height on, so the table can scroll inside it. */}
          <Switch className="flex min-h-0 flex-1 flex-col">
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
                    {t('collection:new')}
                  </Button>
                </Show>
              </div>
            </Match>
            <Match when={list.items.length > 0 && narrowScreen}>
              <RecordRows
                definition={definition}
                items={shownItems}
                label={t(definition.i18n.title)}
                scrollRef={scrollRef}
                more={more}
                onOpen={definition.panel ? open : undefined}
              />
            </Match>
            <Match when={list.items.length > 0}>
              <RecordTable
                definition={definition}
                items={shownItems}
                label={t(definition.i18n.title)}
                scrollRef={scrollRef}
                more={more}
                sort={listing.sort}
                onSort={state.setSort}
                save={save}
                report={report}
                canEdit={canEdit}
                onOpen={definition.panel ? open : undefined}
                selection={selection}
                store={marksStore}
              />
            </Match>
          </Switch>
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
      <Show
        when={
          panelShown && !narrowPanel && openId && chain.length > 0 && openId
        }
        className="h-full"
      >
        {(rootId) => (
          <LinkedTabs
            key={rootId}
            steps={linkedChain.steps.slice(0, -1)}
            onOpen={stepTo}
          />
        )}
      </Show>
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
          <OpenLinked value={openLinked}>
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
              <Match
                when={
                  openId &&
                  chain.length > 0 &&
                  linkedChain.ready &&
                  linkedChain.steps[linkedChain.steps.length - 1]
                }
              >
                {(step) => (
                  <LinkedPanel
                    key={`${step.key}:${step.id}`}
                    step={step}
                    back={back}
                    onClose={stepBack}
                    onLeave={leave}
                  />
                )}
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
                    actions={(record) => actions.menu(record)}
                    onAction={actions.runMenu}
                  />
                )}
              </Match>
            </Switch>
          </OpenLinked>
        </motion.div>
      )}
    </section>
  )
}

/**
 * The table (spec 8): React Aria's Table, virtualized (only the rows in view are in
 * the page), with the next page loaded near the end. A row opens its record
 * (`onRowAction`); a sortable header sorts through the address; the columns are the
 * ones that fit, by priority.
 */
const RecordTable = memo(RecordTableOf) as typeof RecordTableOf

/**
 * Rendered again only when its own props change: opening, switching or closing a
 * record reaches the rows through the store, so the table, and React Aria's state
 * every cell listens to, stay as they are.
 */
function RecordTableOf<T, C>({
  definition,
  items,
  label,
  scrollRef,
  more,
  sort,
  onSort,
  save,
  report,
  canEdit,
  onOpen,
  selection,
  store,
}: {
  definition: CollectionDefinition<T, C>
  items: T[]
  label: string
  scrollRef: RefObject<HTMLDivElement | null>
  more: More
  /** The sort levels chosen, none for the default order; the header marks the first. */
  sort: Sort[]
  onSort: (sort: Sort[]) => void
  save: SaveChange<T>
  report: ReportInvalid<T>
  canEdit: (record: T, id: string) => boolean
  /** Set when a row opens its record in the panel. */
  onOpen?: (id: Id) => void
  /** Set when rows can be selected (spec 8.5): the selected ids. */
  selection?: {
    keys: ReadonlySet<Id>
    onChange: (keys: ReadonlySet<Id>) => void
  }
  /** The open row and the selection, as the rows and cells read them (rowMarks). */
  store: MarksStore
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  // Every column, at its own width: the table scrolls sideways when they don't fit,
  // and the panel opening or closing changes nothing in it (spec 9).
  const { columns } = definition
  /** The pointer or the focus reached a row: its cells mount their editors. */
  function wakeRow(event: { target: EventTarget }) {
    const row = (event.target as Element).closest?.('[role="row"][data-key]')
    const id = row?.getAttribute('data-key')
    if (id) store.wake(id)
  }

  /**
   * Three presses on a header: its first direction, then reversed, then back to the
   * collection's default order (which removes the sort from the address).
   */
  function sortBy(id: string) {
    const column = definition.columns.find((c) => c.id === id)
    if (column) onSort(nextSort(sort, id, column.sort ?? 'asc'))
  }

  return (
    <MarksProvider value={store}>
      <div className="contents" onPointerOver={wakeRow} onFocus={wakeRow}>
        <Virtualizer
          layout={TableLayout}
          layoutOptions={{
            rowHeight: ROW_HEIGHT.table,
            headingHeight: 32,
            loaderHeight: ROW_HEIGHT.table,
          }}
        >
          <Table
            ref={scrollRef}
            aria-label={label}
            sortDescriptor={
              sort[0]
                ? {
                    column: sort[0].by,
                    direction:
                      sort[0].direction === 'asc' ? 'ascending' : 'descending',
                  }
                : undefined
            }
            onSortChange={(descriptor) => sortBy(String(descriptor.column))}
            onRowAction={onOpen ? (key) => onOpen(String(key)) : undefined}
            selectionMode={selection ? 'multiple' : 'none'}
            selectedKeys={selection?.keys}
            // "All" is the rows loaded now: those loaded later are not added (spec 8.5).
            onSelectionChange={(keys) =>
              selection?.onChange(
                new Set(
                  keys === 'all'
                    ? items.map(definition.getId)
                    : [...keys].map(String),
                ),
              )
            }
          >
            <TableHeader columns={columns}>
              {(column) => (
                <Column
                  id={column.id}
                  isRowHeader={column.id === columns[0]?.id}
                  allowsSorting={Boolean(column.sort)}
                  width={column.width ?? COLUMN_WIDTH}
                >
                  {t(column.label)}
                </Column>
              )}
            </TableHeader>
            <TableBody>
              <RowCollection
                items={items}
                // React Aria keeps the rows it built: what they show besides the record.
                // (The open row and the selection are read from the store instead.)
                dependencies={[columns, canEdit, save, report, onOpen]}
              >
                {(record) => {
                  const id = definition.getId(record)
                  return (
                    <MarkedRow
                      id={id}
                      // Names the row (and its checkbox, "Select Item 001").
                      textValue={definition.panel?.title(record) ?? id}
                      columns={columns}
                      onAction={onOpen ? () => onOpen(id) : undefined}
                    >
                      {(column) => (
                        <Cell>
                          <Show
                            as="span"
                            className="block min-w-0 truncate"
                            when={column.id === columns[0]?.id && onOpen}
                            fallback={
                              <CellValue
                                definition={definition}
                                column={column}
                                record={record}
                                save={save}
                                report={report}
                                canEdit={canEdit}
                              />
                            }
                          >
                            {(openRecord) => (
                              <span className="flex items-center gap-2">
                                <span className="min-w-0 flex-1">
                                  <CellValue
                                    definition={definition}
                                    column={column}
                                    record={record}
                                    save={save}
                                    report={report}
                                    canEdit={canEdit}
                                  />
                                </span>
                                {/* Shown on the row under the pointer or the focus: opens the record. */}
                                <button
                                  type="button"
                                  aria-label={t('collection:panel.openRecord', {
                                    name: definition.panel?.title(record) ?? '',
                                  })}
                                  onClick={() => openRecord(id)}
                                  className="-my-1 flex shrink-0 cursor-pointer items-center rounded-[var(--field-radius)] bg-default p-1.5 text-muted opacity-0 outline-none group-hover:opacity-100 group-focus-within:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-foreground"
                                >
                                  <ChevronRight size={16} />
                                </button>
                              </span>
                            )}
                          </Show>
                        </Cell>
                      )}
                    </MarkedRow>
                  )
                }}
              </RowCollection>
              {/* Always here (a wrapper would hide it from React Aria's collection); it
              asks for a page only when there is one to load. */}
              <TableLoadMoreItem
                onLoadMore={() => more.canLoadMore && more.loadMore()}
                isLoading={more.loading}
                label={t('collection:loading')}
              />
            </TableBody>
          </Table>
        </Virtualizer>
      </div>
    </MarksProvider>
  )
}

/** A record's row, marked while its record is open (read from the store). */
function MarkedRow<T extends object>(
  props: Omit<ComponentProps<typeof Row<T>>, 'current'> & { id: Id },
) {
  const current = useMark((marks) => marks.openId === props.id)
  // Its selection checkbox is built when the row is reached, or once it is selected.
  const asleep = useMark(
    (marks, store) => !store.isAwake(props.id) && !marks.selected.has(props.id),
  )
  const number = useMark((marks) => marks.positions.get(props.id) ?? null)
  return (
    <Row
      {...props}
      current={current}
      selectionAsleep={asleep}
      number={number}
    />
  )
}

type SaveShared<T> = (
  column: ColumnDefinition<T>,
  record: T,
  patch: Partial<T>,
  label: string,
) => Promise<void>

/** One value in its cell: its field when the person may change it, else its display. */
function CellValueOf<T, C>({
  definition,
  column,
  record,
  save,
  report,
  canEdit,
}: {
  definition: CollectionDefinition<T, C>
  column: ColumnDefinition<T>
  record: T
  save: SaveChange<T>
  report: ReportInvalid<T>
  canEdit: (record: T, id: string) => boolean
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const label = t(column.label)
  const id = definition.getId(record)
  const shareable = isShared(column)
  // A shared value of a selected row, with others selected: its note, and it changes them all.
  const note = useMark((marks) =>
    shareable && marks.selected.size > 1 && marks.selected.has(id)
      ? marks.note
      : null,
  )
  const marks = useMarks()
  const awake = useMark((_, store) => store.isAwake(id))
  // Woken by the focus on its text: the focus goes on to the editor.
  const { boxRef, onFocusCapture } = useHandFocus<HTMLSpanElement>(awake)
  return (
    <span ref={boxRef} className="contents" onFocusCapture={onFocusCapture}>
      <Awake value={awake}>
        <SharedNote value={note}>
          <ValueField
            record={record}
            field={column.field}
            allowed={canEdit(record, column.id)}
            read={column.cell}
            label={t(column.label)}
            namespace={definition.i18n.namespace}
            save={(patch) => {
              // The latest selection, at the moment of the change.
              const saveShared = marks.get().saveShared as
                SaveShared<T> | undefined
              return note !== null && saveShared
                ? saveShared(column, record, patch, label)
                : save(record, patch, { label })
            }}
            onInvalid={(reason) => report(record, label, reason)}
            look="cell"
          />
        </SharedNote>
      </Awake>
    </span>
  )
}

/** Rendered again only when its own props change, not with its row. */
const CellValue = memo(CellValueOf) as typeof CellValueOf

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
