import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { notify } from '../../notifications'
import { confirm } from '../confirm/confirm'
import type { useRecordActions } from '../data/recordActions'
import type {
  ActionDefinition,
  CollectionDefinition,
  ColumnDefinition,
} from '../definition'
import type { Id } from '../types'

/**
 * Several records selected (spec 8.5): the selection, the actions it offers and a
 * shared value changed on all of it (decision 135). A new search, filter or sort
 * (`view`) clears it; clearing it calls `onCleared` (the list sorts again, 8.6).
 */
export function useSelection<T, C>({
  definition,
  actions,
  records,
  view,
  nameOf,
  onCleared,
}: {
  definition: CollectionDefinition<T, C>
  actions: ReturnType<typeof useRecordActions<T, C>>
  /** The records as shown. */
  records: T[]
  view: string
  nameOf: (record: T) => string
  onCleared: () => void
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const { getId, key } = definition
  const { canEdit, save } = actions
  const countOf = (count: number) => t(definition.i18n.count, { count })

  const [selected, setSelected] = useState<ReadonlySet<Id>>(() => new Set())
  const [selectedView, setSelectedView] = useState(view)
  if (view !== selectedView) {
    setSelectedView(view)
    setSelected(new Set())
  }
  const select = useCallback(
    (keys: ReadonlySet<Id>) => {
      if (keys.size === 0 && selected.size > 0) onCleared()
      setSelected(keys)
    },
    [selected, onCleared],
  )
  /** A removed record leaves the selection. */
  const drop = useCallback(
    (id: Id) =>
      setSelected((keys) => {
        if (!keys.has(id)) return keys
        const next = new Set(keys)
        next.delete(id)
        return next
      }),
    [],
  )
  const selectedRecords = records.filter((record) =>
    selected.has(getId(record)),
  )

  /**
   * Asks, then runs an action on the selected records it applies to: those that
   * succeed leave the list; those that fail stay selected, with one message and Retry.
   */
  async function runBulk(action: ActionDefinition, records: T[]) {
    const total = selectedRecords.length
    const leftOut = selectedRecords.filter(
      (record) => !records.includes(record),
    )
    const confirmed = await confirm({
      title:
        records.length === total
          ? t(`collection:selection.${action.id}Title`, {
              what: countOf(total),
            })
          : t(`collection:selection.${action.id}SomeTitle`, {
              count: records.length,
              what: countOf(total),
            }),
      text:
        leftOut.length === 0
          ? t(`collection:selection.${action.id}Text`, {
              count: records.length,
            })
          : leftOut.length === 1
            ? t(`collection:selection.${action.id}LeftOut`, {
                name: nameOf(leftOut[0]),
              })
            : t(`collection:selection.${action.id}LeftOutMore`, {
                name: nameOf(leftOut[0]),
                count: leftOut.length - 1,
              }),
      button: t(`collection:selection.${action.id}Button`, {
        what: countOf(records.length),
      }),
      danger: true,
    })
    if (!confirmed) return
    const keepSelected = (failed: T[]) =>
      setSelected(new Set(failed.map(getId)))
    keepSelected(await actions.runMany(action, records, keepSelected))
  }

  /** Each action allowed on at least one selected record (spec 8.5). */
  const bulkActions = (definition.actions ?? []).flatMap((action) => {
    const records = selectedRecords.filter((record) =>
      actions.allowed(record).some((allowed) => allowed.id === action.id),
    )
    return records.length > 0
      ? [
          {
            id: action.id,
            label: t(action.label),
            run: () => void runBulk(action, records),
          },
        ]
      : []
  })

  /**
   * A shared value changed on a selected row (decision 135, 147): saved on every
   * selected record the person may change, in one request when the source has
   * `updateMany`, otherwise one at a time. Afterwards one message says on how
   * many, with Undo (each record gets its own previous value back); records that
   * failed keep their value and stay selected, with Retry. A failure on the row
   * edited is rethrown, so its field puts its value back.
   */
  async function saveShared(
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
    const beforeOf = (record: T) => field.patch(field.value(record) as never)
    const failed: T[] = []
    const changed: { record: T; before: Partial<T> }[] = []
    if (actions.saveMany) {
      const refused = await actions.saveMany(targets, patch)
      for (const record of targets)
        if (refused.includes(record)) failed.push(record)
        else changed.push({ record, before: beforeOf(record) })
    } else
      for (const record of targets) {
        const before = beforeOf(record)
        try {
          await save(record, patch)
          changed.push({ record, before })
        } catch {
          failed.push(record)
        }
      }
    const what = countOf(records.length)
    const messageKey = `${key}:shared:${column.id}`
    // The records changed: one message with Undo, even when others failed.
    if (changed.length > 0)
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
            const { saveMany } = actions
            if (!saveMany) {
              for (const { record, before } of changed)
                void save(record, before, { label }).catch(() => {})
              return
            }
            // One request per previous value (a checkbox: at most two).
            const groups = new Map<
              string,
              { before: Partial<T>; records: T[] }
            >()
            for (const { record, before } of changed) {
              const same = JSON.stringify(before)
              const group = groups.get(same) ?? { before, records: [] }
              group.records.push(record)
              groups.set(same, group)
            }
            for (const { before, records } of groups.values())
              void saveMany(records, before).then((refused) => {
                if (refused.length > 0)
                  notify({
                    tone: 'error',
                    text: t('collection:selection.notChanged', {
                      field: label,
                      what: countOf(refused.length),
                    }),
                    scope: key,
                  })
              })
          },
        },
        scope: key,
        key: messageKey,
      })
    // Those that failed stay selected, with Retry, in a message of their own.
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
            void saveShared(column, edited, patch, label, failed).catch(
              () => {},
            ),
        },
        scope: key,
        key: `${messageKey}:failed`,
      })
    }
    if (failed.includes(edited)) throw new Error('not saved')
  }

  return {
    selected,
    select,
    drop,
    selectedRecords,
    bulkActions,
    saveShared,
  }
}
