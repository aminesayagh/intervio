import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../http'
import { navigate } from '../../navigation'
import { dismissKey, notify } from '../../notifications'
import type { MenuAction } from '../../ui-kit'
import { panelAddress } from '../address'
import { confirm } from '../confirm/confirm'
import type { ActionDefinition, CollectionDefinition } from '../definition'
import type { Id } from '../types'
import { cache, keys } from './collectionQuery'
import { announce } from './recordChanges'

/** The scope of a record's messages: they leave when the record does (decision 132). */
export const recordScope = (key: string, id: Id) => `${key}:record:${id}`

/**
 * The one way to change a record of a collection (spec 8.3), from any
 * component, with or without its collection on screen. Each change goes through the
 * collection's data source, updates every cached list and record of it, is announced
 * (`useRecordChanges`), and a refused or failed one is a message (decision 132).
 */
export function useRecordActions<T, C>(
  definition: CollectionDefinition<T, C>,
  context: C,
  /** The collection's list address, for Open full page and Copy link. */
  basePath = definition.basePath ?? `/${definition.key}`,
) {
  const queryClient = useQueryClient()
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])

  return useMemo(() => {
    const { source, getId, key, rights } = definition
    const nameOf = (record: T) =>
      definition.panel?.title(record) ?? getId(record)
    const countOf = (count: number) => t(definition.i18n.count, { count })
    const scope = (record: T) => recordScope(key, getId(record))

    /** Whether the person may change a value of a record (spec 7.7). */
    const canEdit = (record: T, field: string) =>
      !rights || rights(record, context).edit.includes(field)

    /** The collection's actions the person may run on a record. */
    const allowed = (record: T): ActionDefinition[] =>
      (definition.actions ?? []).filter(
        (action) =>
          !rights ||
          (rights(record, context).actions ?? []).includes(action.id),
      )

    /** Gone from every list; the screens showing it close it. */
    function gone(id: Id, record?: T) {
      cache.removed(queryClient, key, id, getId)
      announce({ key, id, kind: 'removed', record })
    }

    /**
     * Saves a change to one record. A refused or failed change is reported and
     * rethrown, so the field puts its value back. `field` names the value for the
     * message; `quiet` leaves the failure to the caller (the description's status line).
     */
    async function save(
      record: T,
      patch: Partial<T>,
      field?: { label: string; quiet?: boolean },
    ): Promise<void> {
      if (!source.update) throw new Error(`${key} cannot be edited`)
      const id = getId(record)
      const valueKey = field && `${key}:${id}:${field.label}`
      const words = { field: field?.label, name: nameOf(record) }
      try {
        const updated = await source.update(id, patch, context)
        cache.updated(queryClient, key, updated, getId)
        announce({ key, id, kind: 'updated', record: updated })
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
            scope: recordScope(key, id),
            key: valueKey,
          })
        } else if (status === 404) {
          // Removed by someone else: the lists refresh and the panel showing it closes.
          gone(id, record)
          void cache.refresh(queryClient, key)
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
              run: () => void save(record, patch, field).catch(() => {}),
            },
            scope: recordScope(key, id),
            key: valueKey,
          })
        }
        throw refusal
      }
    }

    /** A value the definition refused: it went back; the message says why. */
    const report = (record: T, field: string, reason: string) =>
      notify({
        tone: 'error',
        text: t('collection:message.putBack', { reason }),
        scope: scope(record),
        key: `${key}:${getId(record)}:${field}`,
      })

    /** Archived records come back (decision 132: archived records stay in the database). */
    async function restore(records: T[]) {
      try {
        for (const record of records)
          await source.restore!(getId(record), context)
      } catch {
        notify({
          tone: 'error',
          text:
            records.length === 1
              ? t('collection:message.restoreFailed', {
                  name: nameOf(records[0]),
                })
              : t('collection:selection.restoreFailed', {
                  what: countOf(records.length),
                }),
          scope: key,
        })
      }
      void cache.refresh(queryClient, key)
    }
    /** "… archived" with Undo, when the collection can restore. */
    function archived(records: T[]) {
      if (!source.restore) return
      notify({
        tone: 'confirm',
        text:
          records.length === 1
            ? t('collection:message.archived', { name: nameOf(records[0]) })
            : t('collection:selection.archived', {
                what: countOf(records.length),
              }),
        action: {
          label: t('collection:message.undo'),
          run: () => void restore(records),
        },
        scope: key,
      })
    }

    /** Archives or removes one record, already confirmed; a failure has Retry. */
    async function run(action: ActionDefinition, record: T) {
      const id = getId(record)
      try {
        const call = action.id === 'archive' ? source.archive : source.remove
        if (!call) throw new Error(`${key} cannot ${action.id}`)
        await call(id, context)
        gone(id, record)
        if (action.id === 'archive') archived([record])
      } catch {
        // The panel may be closed by now: the message belongs to the collection.
        notify({
          tone: 'error',
          text: t(`collection:message.${action.id}Failed`, {
            name: nameOf(record),
          }),
          action: {
            label: t('collection:message.retry'),
            run: () => void run(action, record),
          },
          scope: key,
        })
      }
    }

    /** Asks the action's confirmation (spec 7.4), then runs it. */
    async function act(action: ActionDefinition, record: T) {
      const confirmed = await confirm({
        title: t(action.confirm.title),
        text: t(action.confirm.text),
        button: t(action.confirm.button),
        danger: true,
      })
      if (confirmed) await run(action, record)
    }

    /**
     * Runs an action on several records, already confirmed, one at a time: those that
     * succeed leave the lists; one message for those that fail, with Retry. Returns them.
     */
    async function runMany(
      action: ActionDefinition,
      records: T[],
      onFailed?: (failed: T[]) => void,
    ): Promise<T[]> {
      const call = action.id === 'archive' ? source.archive : source.remove
      const done: T[] = []
      const failed: T[] = []
      for (const record of records) {
        try {
          if (!call) throw new Error(`${key} cannot ${action.id}`)
          await call(getId(record), context)
          gone(getId(record), record)
          done.push(record)
        } catch {
          failed.push(record)
        }
      }
      if (action.id === 'archive' && done.length) archived(done)
      if (failed.length)
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
            run: () =>
              void runMany(action, failed, onFailed).then((again) =>
                onFailed?.(again),
              ),
          },
          scope: key,
        })
      return failed
    }

    /**
     * Creates a record (spec 7.5): it goes on top of the list it was created in, and
     * "Record created" offers Undo. A failure is the caller's to report.
     */
    async function create(draft: Partial<T>, listKey: readonly unknown[]) {
      if (!source.create) throw new Error(`${key} cannot be created`)
      const created = await source.create(draft, context)
      const id = getId(created)
      cache.created(queryClient, listKey, created)
      announce({ key, id, kind: 'created', record: created })
      notify({
        tone: 'confirm',
        text: t('collection:message.created'),
        action: {
          label: t('collection:message.undo'),
          run: () =>
            void Promise.resolve(source.remove?.(id, context))
              .then(() => gone(id, created))
              .catch(() =>
                notify({
                  tone: 'error',
                  text: t('collection:message.removeFailed', {
                    name: nameOf(created),
                  }),
                  scope: key,
                }),
              ),
        },
        scope: key,
      })
      return created
    }

    /** More actions (spec 7.4): Open full page (not on it), Copy link, then the allowed actions. */
    const menu = (record: T, onPage = false): MenuAction[] => [
      ...(onPage ? [] : [{ id: 'full', label: t('collection:actions.full') }]),
      { id: 'copy', label: t('collection:actions.copy') },
      ...allowed(record).map((action) => ({
        id: action.id,
        label: t(action.label),
        danger: true,
      })),
    ]
    function runMenu(id: string, record: T) {
      const recordId = encodeURIComponent(getId(record))
      if (id === 'full') navigate(`${basePath}/${recordId}`)
      else if (id === 'copy') {
        const link = `${window.location.origin}${panelAddress(basePath, { open: getId(record) })}`
        Promise.resolve(navigator.clipboard?.writeText(link))
          .then(() => {
            if (!navigator.clipboard) throw new Error('no clipboard')
            notify({
              tone: 'confirm',
              text: t('collection:message.copied'),
              scope: scope(record),
            })
          })
          .catch(() =>
            notify({
              tone: 'error',
              text: t('collection:message.notCopied'),
              scope: scope(record),
            }),
          )
      } else {
        const action = (definition.actions ?? []).find((a) => a.id === id)
        if (action) void act(action, record)
      }
    }

    return {
      canEdit,
      allowed,
      save,
      report,
      act,
      runMany,
      create,
      menu,
      runMenu,
    }
  }, [definition, context, basePath, queryClient, t])
}
