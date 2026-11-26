import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Show } from '../../ui-kit'
import type { CollectionDefinition, PanelDefinition } from '../definition'
import { EditableCell } from '../values/EditableCell'
import { PanelClose } from '../parts'
import { dismissScope, notify } from '../../notifications'
import { ValueField } from '../values/ValueField'

function read<T>(key: string): Partial<T> | null {
  try {
    const saved = sessionStorage.getItem(key)
    return saved ? (JSON.parse(saved) as Partial<T>) : null
  } catch {
    return null
  }
}
function keep(key: string, draft: object | null) {
  try {
    if (draft === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify(draft))
  } catch {
    // storage blocked: the draft lives in the panel only
  }
}

/**
 * A new record (spec 7.5): the record view with its defaults and "Not saved yet". It is
 * created as soon as it is ready (usually once its name is filled and the field is
 * left); until then the input lives in the browser tab only.
 */
export function NewRecord<T, C>({
  definition,
  panel,
  defaults,
  onCreated,
  onClose,
  back,
  draftKey: storageKey,
}: {
  definition: CollectionDefinition<T, C>
  panel: PanelDefinition<T>
  /** The collection's defaults, with the active filters' values. */
  defaults: Partial<T>
  /**
   * Creates the record from the draft; `latest` gives the draft as it is when the
   * record comes back, so values typed meanwhile are saved on it.
   */
  onCreated: (draft: Partial<T>, latest: () => Partial<T>) => Promise<void>
  onClose: () => void
  /** Narrow screens: the collection's name, for the way back. */
  back?: string
  /** Where the tab keeps the draft: one per collection and parent (#66). */
  draftKey: string
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const [draft, setDraft] = useState<Partial<T>>(() => ({
    ...defaults,
    ...read<T>(storageKey),
  }))
  const creating = useRef(false)
  // The draft as typed so far, for values typed while the record is being created.
  const latest = useRef(draft)
  const record = draft as T

  const scope = `${definition.key}:new`
  // Leaving the new record (created, discarded, closed) takes its notifications away.
  useEffect(() => () => dismissScope(scope), [scope])

  /** Creates the record; a failure keeps what was typed and offers Retry (7.8). */
  async function create(next: Partial<T>) {
    if (creating.current) return
    creating.current = true
    try {
      await onCreated(next, () => latest.current)
      keep(storageKey, null)
    } catch {
      notify({
        tone: 'error',
        text: t('collection:message.notCreated'),
        action: {
          label: t('collection:message.retry'),
          run: () => void create(next),
        },
        scope,
        key: scope,
      })
    } finally {
      creating.current = false
    }
  }

  /** A value set in the draft; once the draft is ready, it is created. */
  function change(patch: Partial<T>) {
    const next = { ...latest.current, ...patch }
    latest.current = next
    setDraft(next)
    keep(storageKey, next)
    if (definition.create?.ready(next)) void create(next)
    return Promise.resolve()
  }

  return (
    <aside
      aria-label={t(definition.create?.add ?? 'collection:panel.label')}
      className="relative flex h-full w-full flex-col overflow-y-auto border-s border-border ps-8 pe-6"
    >
      <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background pt-4 lg:h-[4.5rem] lg:pt-6">
        <span className="text-xs text-muted">
          {t('collection:create.notSaved')}
        </span>
        <span className="ms-auto" />
        <PanelClose
          back={back}
          backLabel={back && t('collection:panel.back', { name: back })}
          label={t('collection:panel.close')}
          onClose={onClose}
        />
      </div>

      <div className="flex flex-col gap-6 pt-2 pb-8">
        <div>
          <h2 className="text-xl font-medium">
            <Show as="span" when={panel.titleEdit}>
              {(edit) => (
                <EditableCell
                  record={record}
                  edit={edit}
                  label={t('collection:panel.title')}
                  namespace={definition.i18n.namespace}
                  save={change}
                  look="title"
                  placeholder={t('collection:create.name')}
                  autoFocus
                />
              )}
            </Show>
          </h2>
        </div>

        <dl className="grid grid-cols-[176px_minmax(0,1fr)] items-start gap-x-4 gap-y-3">
          {panel.properties
            .filter(
              (property) =>
                property.field && property.field.type !== 'richText',
            )
            .map((property) => (
              <div key={property.id} className="contents">
                <dt className="grid min-h-8 content-center text-muted">
                  {t(property.label)}
                </dt>
                <dd className="grid min-h-8 min-w-0 content-center">
                  <ValueField
                    record={record}
                    field={property.field}
                    allowed
                    read={property.value}
                    label={t(property.label)}
                    namespace={definition.i18n.namespace}
                    save={change}
                    look="panel"
                  />
                </dd>
              </div>
            ))}
        </dl>
      </div>
    </aside>
  )
}
