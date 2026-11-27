import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { entryState } from '../../navigation'
import { confirm } from '../confirm/confirm'
import { keys } from '../data/collectionQuery'
import type { useRecordActions } from '../data/recordActions'
import type { CollectionDefinition } from '../definition'
import { newRecordKey } from '../record/recordQuery'
import { current, type usePanel } from '../record/usePanel'
import { valuesOf } from '../views/views'

/**
 * A new record (spec 7.5): "New" (or a kanban column's "+") opens it in the panel,
 * with the collection's defaults and the values the list is filtered on; it is
 * created once ready, and closing asks first when input would be lost (its own, or a
 * description's not saved yet, 7.6).
 */
export function useNewRecord<T, C>({
  definition,
  context,
  stateKey,
  query,
  actions,
  panel,
}: {
  definition: CollectionDefinition<T, C>
  context: C
  /** The tab's name for this mounted collection (its draft's key). */
  stateKey: string
  /** The list shown: its filters give values, and the new record joins its cache. */
  query: Parameters<typeof keys.list>[2]
  actions: ReturnType<typeof useRecordActions<T, C>>
  panel: Pick<
    ReturnType<typeof usePanel>,
    'isNew' | 'openId' | 'mark' | 'panelMark' | 'doClose'
  >
}) {
  const { t } = useTranslation('collection')
  const { key, getId } = definition
  const { isNew, openId, mark, panelMark, doClose } = panel
  // A new record (spec 7.5): ?new=1 in the address; its input waits in the tab.
  const hasDraft = useCallback(() => {
    try {
      return sessionStorage.getItem(newRecordKey(stateKey)) !== null
    } catch {
      return false
    }
  }, [stateKey])
  // Values a new record starts with besides the list's (a kanban column's, MAS-36).
  const [newIn, setNewIn] = useState<Partial<T>>({})
  const startNew = useCallback(() => {
    setNewIn({})
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
        sessionStorage.removeItem(newRecordKey(stateKey))
      } catch {
        // storage blocked: nothing kept
      }
      doClose()
    } else doClose()
  }, [key, stateKey, openId, doClose, isNew, hasDraft, t])

  // A new record takes the values the list is filtered on (the view's locked ones
  // too), so it stays in the list it was created in (spec 7.5, 12.1, MOH-34). Only
  // worked out while a new record is open.
  const newDefaults = useMemo(
    () =>
      isNew
        ? ({
            ...definition.create?.defaults(context as C),
            ...valuesOf(definition, query.filters),
            ...newIn,
          } as Omit<T, 'id'>)
        : undefined,
    [isNew, definition, query.filters, context, newIn],
  )
  const createRecord = useCallback(
    async (draft: Partial<T>, latest: () => Partial<T>) => {
      const created = await actions.create(
        draft,
        keys.list(key, context, query),
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
    [actions, key, context, getId, query, mark],
  )
  /** "+" on a kanban column: a new record with its value (MAS-36). */
  const createIn = useCallback(
    (values: Partial<T>) => {
      startNew()
      setNewIn(values)
    },
    [startNew],
  )

  return { startNew, createIn, newDefaults, createRecord, close }
}
