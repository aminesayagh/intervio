import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Show } from '../ui-kit'
import { ChoiceCell } from './ChoiceCell'
import type { CollectionDefinition, PanelDefinition } from './definition'
import { EditableCell } from './EditableCell'
import { PanelClose } from './parts'
import { newRecordKey } from './recordQuery'
import { refusalMessage } from './refusal'

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
}: {
  definition: CollectionDefinition<T, C>
  panel: PanelDefinition<T>
  /** The collection's defaults, with the active filters' values. */
  defaults: Partial<T>
  onCreated: (draft: Partial<T>) => Promise<void>
  onClose: () => void
  /** Narrow screens: the collection's name, for the way back. */
  back?: string
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const storageKey = newRecordKey(definition.key)
  const [draft, setDraft] = useState<Partial<T>>(() => ({
    ...defaults,
    ...read<T>(storageKey),
  }))
  const [error, setError] = useState<string | null>(null)
  const creating = useRef(false)
  const record = draft as T

  /** A value set in the draft; once the draft is ready, it is created. */
  async function change(patch: Partial<T>) {
    const next = { ...draft, ...patch }
    setDraft(next)
    keep(storageKey, next)
    if (creating.current || !definition.create?.ready(next)) return
    creating.current = true
    setError(null)
    try {
      await onCreated(next)
      keep(storageKey, null)
    } catch (refusal) {
      setError(t(refusalMessage(refusal)))
    } finally {
      creating.current = false
    }
  }

  return (
    <aside
      aria-label={t(definition.create?.add ?? 'collection:panel.label')}
      className="scroll-quiet flex h-full w-full flex-col overflow-y-auto border-s border-border ps-8 pe-6"
    >
      <div className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 bg-background">
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
            {panel.titleEdit && (
              <EditableCell
                record={record}
                edit={panel.titleEdit}
                label={t('collection:panel.title')}
                namespace={definition.i18n.namespace}
                save={change}
                look="title"
                placeholder={t('collection:create.name')}
                autoFocus
              />
            )}
          </h2>
          <Show when={error}>
            {(message) => (
              <p role="alert" className="mt-1 text-xs text-danger">
                {message}
              </p>
            )}
          </Show>
        </div>

        <dl className="grid grid-cols-[176px_minmax(0,1fr)] gap-x-4 gap-y-3">
          {panel.properties
            .filter((property) => property.edit || property.choose)
            .map((property) => (
              <div key={property.id} className="contents">
                <dt className="text-muted">{t(property.label)}</dt>
                <dd className="min-w-0">
                  {property.edit ? (
                    <EditableCell
                      record={record}
                      edit={property.edit}
                      label={t(property.label)}
                      namespace={definition.i18n.namespace}
                      save={change}
                      look="panel"
                    />
                  ) : (
                    <ChoiceCell
                      record={record}
                      choose={property.choose!}
                      render={property.value}
                      label={t(property.label)}
                      namespace={definition.i18n.namespace}
                      save={change}
                      look="panel"
                    />
                  )}
                </dd>
              </div>
            ))}
        </dl>
      </div>
    </aside>
  )
}
