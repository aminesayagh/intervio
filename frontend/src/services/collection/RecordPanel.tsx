import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../http'
import { cn, Icon, Match, Show, Switch } from '../ui-kit'
import { keys } from './collectionQuery'
import type { CollectionDefinition, PanelDefinition } from './definition'
import { ChoiceCell } from './ChoiceCell'
import { Description } from './Description'
import { EditableCell } from './EditableCell'
import { Button } from './parts'
import type { Id } from './types'

/** A record removed, or that the person can no longer see (spec 7.2). */
const isUnavailable = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 403)

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
  onUnavailable,
  canEdit,
  save,
}: {
  definition: CollectionDefinition<T, C>
  panel: PanelDefinition<T>
  context: C
  id: Id
  /** The record as the list has it, shown while the server's copy loads. */
  fromList: T | undefined
  onClose: () => void
  onUnavailable: (id: Id) => void
  /** Whether the person may change a value (spec 7.7). */
  canEdit: (record: T, id: string) => boolean
  save: (record: T, patch: Partial<T>) => Promise<void>
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  const query = useQuery<T, Error, T, readonly unknown[]>({
    queryKey: keys.record(definition.key, id),
    queryFn: () => definition.source.one(id, context),
    // A record is never a function, but TanStack can't know it of a generic type.
    placeholderData: () => fromList as never,
    retry: (failures, error) => !isUnavailable(error) && failures < 1,
  })
  const record = query.data
  const unavailable = query.isError && isUnavailable(query.error)
  const editable = [
    ...(panel.titleEdit ? ['title'] : []),
    ...panel.properties
      .filter((property) => property.edit || property.choose)
      .map((property) => property.id),
    ...(panel.description ? ['description'] : []),
  ]
  const viewOnly =
    record !== undefined && !editable.some((id) => canEdit(record, id))

  // A removed record leaves the list too.
  useEffect(() => {
    if (unavailable) onUnavailable(id)
  }, [unavailable, id, onUnavailable])

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
      className="scroll-quiet flex h-full w-[560px] shrink-0 flex-col overflow-y-auto border-s border-border ps-8 pe-6"
    >
      <div className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 bg-background">
        <Show as="span" when={record !== undefined && !unavailable}>
          {record !== undefined && panel.type(record)}
        </Show>
        <Show as="span" when={record !== undefined && !unavailable && viewOnly}>
          <span className="text-xs text-muted">
            {t('collection:panel.viewOnly')}
          </span>
        </Show>
        <Button
          look="ghost"
          size="sm"
          aria-label={t('collection:panel.close')}
          onPress={onClose}
          className="ms-auto px-2"
        >
          <Icon name="Close" size={16} />
        </Button>
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
          <PanelPlaceholders label={t('collection:panel.loading')} />
        </Match>
        <Match when={record}>
          {(shown) => (
            <div className="flex flex-col gap-6 pt-2 pb-8">
              <div>
                <h2
                  ref={focusTitle}
                  aria-label={panel.title(shown)}
                  tabIndex={-1}
                  className="text-xl font-medium break-words outline-none"
                >
                  {panel.titleEdit && canEdit(shown, 'title') ? (
                    <EditableCell
                      record={shown}
                      edit={panel.titleEdit}
                      label={t('collection:panel.title')}
                      namespace={definition.i18n.namespace}
                      save={(patch) => save(shown, patch)}
                      look="title"
                    />
                  ) : (
                    panel.title(shown)
                  )}
                </h2>
                <Show when={panel.subtitle}>
                  {(subtitle) => (
                    <p className="mt-1 text-xs text-muted">{subtitle(shown)}</p>
                  )}
                </Show>
              </div>

              <dl className="grid grid-cols-[176px_minmax(0,1fr)] gap-x-4 gap-y-3">
                {panel.properties.map((property) => (
                  <div key={property.id} className="contents">
                    <dt className="text-muted">{t(property.label)}</dt>
                    <dd className="min-w-0">
                      {property.edit && canEdit(shown, property.id) ? (
                        <EditableCell
                          record={shown}
                          edit={property.edit}
                          label={t(property.label)}
                          namespace={definition.i18n.namespace}
                          save={(patch) => save(shown, patch)}
                          look="panel"
                        />
                      ) : property.choose && canEdit(shown, property.id) ? (
                        <ChoiceCell
                          record={shown}
                          choose={property.choose}
                          render={property.value}
                          label={t(property.label)}
                          namespace={definition.i18n.namespace}
                          save={(patch) => save(shown, patch)}
                          look="panel"
                        />
                      ) : (
                        property.value(shown)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              {panel.description && (
                <Description
                  key={id}
                  value={panel.description.value(shown)}
                  editable={canEdit(shown, 'description')}
                  storageKey={`intervio.collection.${definition.key}.${id}.description`}
                  save={(text) => save(shown, panel.description!.patch(text))}
                />
              )}

              {panel.sections?.map((section) => {
                const items = section.items(shown)
                return (
                  <section
                    key={section.id}
                    className="border-t border-border pt-4"
                  >
                    <h3 className="flex items-baseline gap-2 font-medium">
                      {t(section.label)}
                      <span className="text-xs font-normal text-muted">
                        {items.length}
                      </span>
                    </h3>
                    <ul className="mt-2 flex flex-col">
                      {items.slice(0, 5).map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-2 border-b border-border py-2"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {item.label}
                          </span>
                          {item.kind}
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </Match>
      </Switch>
    </aside>
  )
}

/** Grey bars where the record's title and properties will be. */
function PanelPlaceholders({ label }: { label: string }) {
  const bar = 'block rounded-[var(--field-radius)] bg-default'
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3 pt-2">
      <span className={cn(bar, 'h-6 w-64')} />
      <span className={cn(bar, 'mb-4 h-3 w-40')} />
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="flex gap-4">
          <span className={cn(bar, 'h-4 w-28')} />
          <span className={cn(bar, 'h-4 w-48')} />
        </span>
      ))}
    </div>
  )
}
