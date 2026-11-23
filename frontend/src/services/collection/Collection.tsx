import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  memo,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
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
  Cell,
  cn,
  Column,
  ConfirmDialog,
  SELECTION_WIDTH,
  foldSidebar,
  Icon,
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
  type MenuAction,
  Virtualizer,
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
import { SelectionBar } from './selection/SelectionBar'
import { isShared, SharedNote } from './selection/sharedEdit'
import { Awake } from './values/awake'
import { Folds, type Fold } from './drill/Folded'
import { currentViews } from './drill/viewStack'
import { formatChain, OpenLinked, parseChain, type Step } from './record/linked'
import { LinkedPanel } from './record/LinkedPanel'
import { LinkedTabs } from './record/LinkedTabs'
import {
  MarksProvider,
  useMark,
  useMarks,
  useMarksStore,
  type Marks,
} from './list/rowMarks'
import type { Id, ListQuery, ReportInvalid, SaveChange } from './types'
import { ValueField } from './values/ValueField'
import { isNarrowed, useCollectionState } from './list/useCollectionState'

addTranslations('collection', { en, fr })

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
  const basePath = basePathProp ?? definition.basePath
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const scrollRef = useRef<HTMLDivElement>(null)
  const state = useCollectionState(
    definition.key,
    definition.defaultSort,
    definition.scopes?.map((scope) => scope.id),
  )
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

  /**
   * A changed record keeps its place (spec 8.6): after a change the table holds the
   * order it showed, and the records changed here stay even if they no longer match;
   * the list reloads behind it. `release` sorts it again.
   */
  const [hold, setHold] = useState<{ order: Id[]; kept: Map<Id, T> } | null>(
    null,
  )
  const shownRef = useRef<T[]>([])
  const keepPlace = useCallback(
    (record: T) =>
      setHold((held) => ({
        order: held?.order ?? shownRef.current.map(getId),
        kept: new Map(held?.kept).set(getId(record), record),
      })),
    [getId],
  )
  const forget = useCallback(
    (id: Id) =>
      setHold((held) => {
        if (!held) return held
        const kept = new Map(held.kept)
        kept.delete(id)
        return { order: held.order.filter((other) => other !== id), kept }
      }),
    [],
  )
  const release = useCallback(() => setHold(null), [])
  const shownItems = useMemo(() => {
    if (!hold) return list.items
    const latest = new Map(list.items.map((record) => [getId(record), record]))
    const held = hold.order.flatMap((id) => {
      const record = latest.get(id) ?? hold.kept.get(id)
      return record ? [record] : []
    })
    const placed = new Set(hold.order)
    return [
      ...held,
      ...list.items.filter((record) => !placed.has(getId(record))),
    ]
  }, [hold, list.items, getId])
  shownRef.current = shownItems
  // Out of order: the list, reloaded, would show them in another order.
  const outOfOrder =
    hold !== null &&
    shownItems.map(getId).join() !== list.items.map(getId).join()

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
      params.delete('linked') // another record from the list: no linked ones after it
      // Opening pushes an entry (Back closes); switching records replaces it.
      setSearchParams(params, {
        replace: wasOpen,
        state: wasOpen
          ? { ...entryState(), linkedStep: false }
          : { panel: panelMark },
      })
    },
    [panelMark],
  )

  // Linked records opened in the panel after it (decision 137): ?linked=key:id,…
  const linkedParam = useSearchParams().get('linked')
  const chain = useMemo(() => parseChain(linkedParam), [linkedParam])
  /** Shows the chain cut to this many steps (0: the record opened from the list). */
  const showChain = useCallback((next: Step[], push = false) => {
    const params = new URLSearchParams(window.location.search)
    if (next.length) params.set('linked', formatChain(next))
    else params.delete('linked')
    setSearchParams(params, {
      replace: !push,
      state: push ? { ...entryState(), linkedStep: true } : entryState(),
    })
  }, [])
  /** A section's record opens in the panel; Back returns to the one before. */
  const openLinked = useCallback(
    (collectionKey: string, id: Id) =>
      showChain(
        [
          ...parseChain(
            new URLSearchParams(window.location.search).get('linked'),
          ),
          { key: collectionKey, id },
        ],
        true,
      ),
    [showChain],
  )
  /** "‹ {collection}" on a narrow screen: the list, whatever the depth. */
  const leave = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.delete('open')
    params.delete('linked')
    setSearchParams(params, { replace: true })
  }, [])
  /** × on a linked record: one step back, as Back does when the step was pushed. */
  const stepBack = useCallback(() => {
    if (entryState().linkedStep === true) window.history.back()
    else showChain(chain.slice(0, -1))
  }, [chain, showChain])
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
        keepPlace(updated)
        void cache.refresh(queryClient, key)
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
          forget(id)
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
    [
      source,
      getId,
      key,
      context,
      queryClient,
      nameOf,
      recordScope,
      doClose,
      t,
      keepPlace,
      forget,
    ],
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
      forget(recordId)
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

  /** "3 items": the collection's own words for a number of its records. */
  const countOf = (count: number) => t(definition.i18n.count, { count })
  // Several records selected (spec 8.5): only when the collection has actions for them.
  const selectable = Boolean(definition.actions?.length)
  const [selected, setSelected] = useState<ReadonlySet<Id>>(() => new Set())
  // A new search, filter or sort clears the selection.
  const view = JSON.stringify([listing.search, listing.filters, listing.sort])
  const [selectedView, setSelectedView] = useState(view)
  if (view !== selectedView) {
    setSelectedView(view)
    setSelected(new Set())
    setHold(null)
  }
  /** Clearing the selection sorts the list again (spec 8.6). */
  const select = (keys: ReadonlySet<Id>) => {
    if (keys.size === 0 && selected.size > 0) release()
    setSelected(keys)
  }
  // Opening another record sorts the list again.
  const [heldFor, setHeldFor] = useState(openId)
  if (openId !== heldFor) {
    setHeldFor(openId)
    if (openId) setHold(null)
  }
  const selectedRecords = shownItems.filter((record) =>
    selected.has(getId(record)),
  )
  const [bulk, setBulk] = useState<{
    action: ActionDefinition
    records: T[]
    total: number
  } | null>(null)
  const bulkActions = (definition.actions ?? []).flatMap((action) => {
    const records = selectedRecords.filter((record) =>
      allowedActions(record).some((allowed) => allowed.id === action.id),
    )
    return records.length > 0
      ? [
          {
            id: action.id,
            label: t(action.label),
            run: () =>
              setBulk({ action, records, total: selectedRecords.length }),
          },
        ]
      : []
  })
  /**
   * Runs an action on each record, one at a time: those that succeed leave the list;
   * those that fail stay selected, with one message and Retry.
   */
  async function runBulk(action: ActionDefinition, records: T[]) {
    const run = action.id === 'archive' ? source.archive : source.remove
    const failed: T[] = []
    for (const record of records) {
      const recordId = getId(record)
      try {
        if (!run) throw new Error(`${key} cannot ${action.id}`)
        await run(recordId, context as C)
        cache.removed(queryClient, key, recordId, getId)
        forget(recordId)
        if (openId === recordId) doClose()
      } catch {
        failed.push(record)
      }
    }
    setSelected(new Set(failed.map(getId)))
    if (failed.length === 0) return
    notify({
      tone: 'error',
      text:
        failed.length === 1
          ? t(`collection:message.${action.id}Failed`, {
              name: nameOf(failed[0]),
            })
          : t(`collection:selection.${action.id}Failed`, {
              what: countOf(failed.length),
            }),
      action: {
        label: t('collection:message.retry'),
        run: () => void runBulk(action, failed),
      },
      scope: key,
    })
  }
  /**
   * A shared value changed on a selected row (decision 135): saved on every selected
   * record the person may change, one at a time. Afterwards one message says on how
   * many, with Undo (each record gets its own previous value back); records that
   * failed keep their value and stay selected, with Retry. A failure on the row
   * edited is rethrown, so its field puts its value back.
   */
  async function saveOnSelection(
    column: ColumnDefinition<T>,
    edited: T,
    patch: Partial<T>,
    label: string,
    records: T[] = selectedRecords,
  ) {
    const field = column.field as {
      value: (record: T) => unknown
      patch: (value: never) => Partial<T>
    }
    const targets = records.filter((record) => canEdit(record, column.id))
    const failed: T[] = []
    const changed: { record: T; before: Partial<T> }[] = []
    for (const record of targets) {
      const before = field.patch(field.value(record) as never)
      try {
        await save(record, patch)
        changed.push({ record, before })
      } catch {
        failed.push(record)
      }
    }
    const what = countOf(records.length)
    const messageKey = `${key}:shared:${column.id}`
    if (failed.length > 0) {
      setSelected(new Set(failed.map(getId)))
      notify({
        tone: 'error',
        text: t('collection:selection.notChanged', {
          field: label,
          what: countOf(failed.length),
        }),
        action: {
          label: t('collection:message.retry'),
          run: () =>
            void saveOnSelection(column, edited, patch, label, failed).catch(
              () => {},
            ),
        },
        scope: key,
        key: messageKey,
      })
    } else
      notify({
        tone: 'confirm',
        text:
          changed.length === records.length
            ? t('collection:selection.changed', { field: label, what })
            : t('collection:selection.changedSome', {
                field: label,
                count: changed.length,
                what,
              }),
        action: {
          label: t('collection:message.undo'),
          run: () => {
            for (const { record, before } of changed)
              void save(record, before, { label }).catch(() => {})
          },
        },
        scope: key,
        key: messageKey,
      })
    if (failed.includes(edited)) throw new Error('not saved')
  }
  function confirmBulk() {
    if (!bulk) return
    setBulk(null)
    void runBulk(bulk.action, bulk.records)
  }
  const bulkLeftOut = bulk
    ? selectedRecords.filter((record) => !bulk.records.includes(record))
    : []
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
  const more: More = {
    canLoadMore:
      list.hasNextPage &&
      !list.isFetchingNextPage &&
      !list.isFetchNextPageError,
    loadMore,
    loading: list.isFetchingNextPage,
    hasMore: list.hasNextPage && !list.isFetchNextPageError,
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
  // The views this list was drilled from (spec 12.1): a strip each, after the sidebar.
  // Returning to one takes it and the views after it off the stack.
  const strips: Fold[] =
    mode === 'narrow'
      ? []
      : currentViews().map((view, index) => ({
          name: view.name,
          open: () => navigate(view.address, { state: { drill: index } }),
        }))
  const hasStrips = strips.length > 0
  // Medium width: the sidebar folds while a panel or a strip shows (spec 9, 12.1).
  useEffect(() => {
    foldSidebar(mode === 'medium' && (panelShown || hasStrips))
    return () => foldSidebar(false)
  }, [mode, panelShown, hasStrips])
  // The table's columns: as many as fit, in the collection's priority (spec 9).
  // Tabs before the panel take their room from the list (at most 2 show).
  const tabsWidth = Math.min(chain.length, 2) * 32
  const listWidth =
    (panelShown && mode !== 'narrow'
      ? space - panelWidth - 8 - tabsWidth
      : space) -
    24 -
    (selectable ? SELECTION_WIDTH : 0)
  const priority =
    definition.columnPriority ?? definition.columns.map((column) => column.id)
  // The same ids keep the same array, so the table's columns (and the fields being
  // edited in them) are not rebuilt on every render.
  // In priority order, while their widths fit (a column without one takes at least
  // PANEL.column); the first always shows. So every column shown is in view.
  const shownKey = (() => {
    if (!space) return priority.join(',')
    const widths = new Map(
      definition.columns.map((column) => [
        column.id,
        column.width ?? PANEL.column,
      ]),
    )
    const fitting: string[] = []
    let used = 0
    for (const id of priority) {
      used += widths.get(id) ?? PANEL.column
      if (fitting.length > 0 && used > listWidth) break
      fitting.push(id)
    }
    return fitting.join(',')
  })()
  // Columns that come back (the panel closes) are added in the next render, so the
  // panel leaves first; both in one render were over 200 ms in a production build.
  // Columns that no longer fit leave at once: the narrower table would lay them out
  // for nothing.
  const deferredKey = useDeferredValue(shownKey)
  const columnsKey =
    shownKey.split(',').length < deferredKey.split(',').length
      ? shownKey
      : deferredKey
  const shownColumns = useMemo(() => columnsKey.split(','), [columnsKey])
  const narrowPanel = mode === 'narrow' && panelShown
  const back = narrowPanel ? t(definition.i18n.title) : undefined

  const dialogs = (
    <>
      <ConfirmDialog
        open={bulk !== null}
        title={
          bulk
            ? bulk.records.length === bulk.total
              ? t(`collection:selection.${bulk.action.id}Title`, {
                  what: countOf(bulk.total),
                })
              : t(`collection:selection.${bulk.action.id}SomeTitle`, {
                  count: bulk.records.length,
                  what: countOf(bulk.total),
                })
            : ''
        }
        text={
          bulk
            ? bulkLeftOut.length === 0
              ? t(`collection:selection.${bulk.action.id}Text`, {
                  count: bulk.records.length,
                })
              : bulkLeftOut.length === 1
                ? t(`collection:selection.${bulk.action.id}LeftOut`, {
                    name: nameOf(bulkLeftOut[0]),
                  })
                : t(`collection:selection.${bulk.action.id}LeftOutMore`, {
                    name: nameOf(bulkLeftOut[0]),
                    count: bulkLeftOut.length - 1,
                  })
            : ''
        }
        confirm={
          bulk
            ? t(`collection:selection.${bulk.action.id}Button`, {
                what: countOf(bulk.records.length),
              })
            : ''
        }
        cancel={t('collection:actions.cancel')}
        danger
        onConfirm={confirmBulk}
        onCancel={() => setBulk(null)}
      />
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

        <div className="flex flex-wrap items-center gap-2">
          <Switch className="min-w-0 flex-1">
            <Match when={selectedRecords.length > 0}>
              <SelectionBar
                count={selectedRecords.length}
                actions={bulkActions}
                onClear={() => select(new Set())}
              />
            </Match>
            <Match when={narrowed || list.items.length > 0}>
              <Toolbar
                namespace={definition.i18n.namespace}
                filters={definition.filters ?? []}
                scopes={definition.scopes}
                listing={listing}
                onSearch={state.setSearch}
                onFilter={state.setFilter}
                onClear={state.clear}
              />
            </Match>
          </Switch>
          {/* A changed record keeps its place until the list is sorted again (spec 8.6). */}
          <Show
            when={outOfOrder}
            className="ms-auto flex items-center gap-3 text-muted"
          >
            <span aria-live="polite">{t('collection:held.text')}</span>
            <Button size="sm" onPress={release}>
              {t('collection:held.sort')}
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
                    {definition.create ? t(definition.create.add) : null}
                  </Button>
                </Show>
              </div>
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
                openId={definition.panel ? openId : null}
                shown={shownColumns}
                onOpen={definition.panel ? open : undefined}
                selection={
                  selectable ? { keys: selected, onChange: select } : undefined
                }
                marks={{
                  openId: definition.panel ? openId : null,
                  selected,
                  note: t('collection:selection.appliesTo', {
                    what: countOf(selectedRecords.length),
                  }),
                  saveShared: saveOnSelection,
                }}
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
            root={definition}
            context={context}
            openId={rootId}
            chain={chain}
            onOpen={(depth) => showChain(chain.slice(0, depth))}
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
                when={openId && chain.length > 0 && chain[chain.length - 1]}
              >
                {(step) => (
                  <LinkedPanel
                    key={`${step.key}:${step.id}`}
                    root={definition}
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
                    actions={(record) => menuActions(record, false)}
                    onAction={runMenu}
                  />
                )}
              </Match>
            </Switch>
          </OpenLinked>
        </motion.div>
      )}
      {dialogs}
    </section>
  )
}

/**
 * The table (spec 8): React Aria's Table, virtualized (only the rows in view are in
 * the page), with the next page loaded near the end. A row opens its record
 * (`onRowAction`); a sortable header sorts through the address; the columns are the
 * ones that fit, by priority.
 */
function RecordTable<T, C>({
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
  openId,
  onOpen,
  shown,
  selection,
  marks,
}: {
  definition: CollectionDefinition<T, C>
  items: T[]
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
  /** Set when rows can be selected (spec 8.5): the selected ids. */
  selection?: {
    keys: ReadonlySet<Id>
    onChange: (keys: ReadonlySet<Id>) => void
  }
  /** The open row and the selection, as the rows and cells read them (rowMarks). */
  marks: Marks
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  // The same array while the same columns fit: a new one would rebuild every row.
  const columns = useMemo(
    () => definition.columns.filter((column) => shown.includes(column.id)),
    [definition.columns, shown],
  )
  const store = useMarksStore(marks)
  /** The pointer or the focus reached a row: its cells mount their editors. */
  function wakeRow(event: { target: EventTarget }) {
    const row = (event.target as Element).closest?.('[role="row"][data-key]')
    const id = row?.getAttribute('data-key')
    if (id) store.wake(id)
  }

  // The open record's row stays in view (after ↑ / ↓, or a link).
  useEffect(() => {
    if (!openId) return
    scrollRef.current
      ?.querySelector(`[data-key="${CSS.escape(openId)}"]`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [openId, scrollRef])

  /**
   * Three presses on a header: its first direction, then reversed, then back to the
   * collection's default order (which removes the sort from the address).
   */
  function sortBy(id: string) {
    const column = definition.columns.find((c) => c.id === id)
    if (!column) return
    const first = column.sort ?? 'asc'
    if (sort?.by !== id) onSort({ by: id, direction: first })
    else if (sort.direction === first)
      onSort({ by: id, direction: first === 'asc' ? 'desc' : 'asc' })
    else onSort(null)
  }

  return (
    <MarksProvider value={store}>
      <div className="contents" onPointerOver={wakeRow} onFocus={wakeRow}>
        <Virtualizer
          layout={TableLayout}
          layoutOptions={{ rowHeight: 43, headingHeight: 32, loaderHeight: 43 }}
        >
          <Table
            ref={scrollRef}
            aria-label={label}
            sortDescriptor={
              sort
                ? {
                    column: sort.by,
                    direction:
                      sort.direction === 'asc' ? 'ascending' : 'descending',
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
                  width={column.width ?? '1fr'}
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
                                  <Icon name="lucide/chevron-right" size={16} />
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
  return <Row {...props} current={current} />
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
  const box = useRef<HTMLSpanElement>(null)
  const refocus = useRef(false)
  useEffect(() => {
    if (!awake || !refocus.current) return
    refocus.current = false
    // After a frame: when the focused text leaves, React Aria first puts the focus
    // back on the row, in its own effects.
    const frame = requestAnimationFrame(() =>
      box.current
        ?.querySelector<HTMLElement>('input, [role="spinbutton"]')
        ?.focus(),
    )
    return () => cancelAnimationFrame(frame)
  }, [awake])
  return (
    <span
      ref={box}
      className="contents"
      onFocusCapture={(event) => {
        if ((event.target as HTMLElement).dataset.asleep !== undefined)
          refocus.current = true
      }}
    >
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

/**
 * Rendered again only when its own props change: when the panel opens or closes, the
 * table's columns change and every row is built again, but the values already shown
 * stay as they are.
 */
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
