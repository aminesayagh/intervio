import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn, Show } from '../../ui-kit'
import type { CollectionDefinition, PanelDefinition } from '../definition'
import { recordScope } from '../data/recordActions'
import { RichText } from '../values/RichText'
import { EditableCell } from '../values/EditableCell'
import type { Id, ReportInvalid, SaveChange } from '../types'
import { Properties } from './Properties'
import { Sections } from './Sections'

/**
 * A record's content, the same in the panel and on the full page (spec 7, 13): title,
 * subtitle, properties, description, linked records. On the page the linked records
 * take the right column.
 */
export function RecordBody<T, C>({
  definition,
  panel,
  id,
  record: shown,
  canEdit,
  save,
  report,
  focusTitle,
  layout,
  context,
}: {
  definition: CollectionDefinition<T, C>
  panel: PanelDefinition<T>
  id: Id
  record: T
  canEdit: (record: T, id: string) => boolean
  save: SaveChange<T>
  report: ReportInvalid<T>
  focusTitle?: (node: HTMLHeadingElement | null) => void
  layout: 'panel' | 'page'
  /** The collection's context, which a section may pass on to its own (spec 4). */
  context?: C
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  return (
    <div
      className={cn(
        layout === 'page' &&
          'grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start gap-12',
      )}
    >
      <div className="flex flex-col gap-6">
        <div>
          <h2
            ref={focusTitle}
            aria-label={panel.title(shown)}
            tabIndex={-1}
            className="text-xl font-medium break-words outline-none"
          >
            <Show
              as="span"
              when={canEdit(shown, 'title') && panel.titleEdit}
              fallback={panel.title(shown)}
            >
              {(edit) => (
                <EditableCell
                  record={shown}
                  edit={edit}
                  label={t('collection:panel.title')}
                  namespace={definition.i18n.namespace}
                  save={(patch) =>
                    save(shown, patch, { label: t('collection:panel.name') })
                  }
                  onInvalid={(reason) =>
                    report(shown, t('collection:panel.name'), reason)
                  }
                  look="title"
                />
              )}
            </Show>
          </h2>
          <Show when={panel.subtitle}>
            {(subtitle) => (
              <p className="mt-1 text-xs text-muted">{subtitle(shown)}</p>
            )}
          </Show>
        </div>

        <Properties
          definition={definition}
          panel={panel}
          record={shown}
          canEdit={canEdit}
          save={save}
          report={report}
          layout={layout}
        />

        <Show when={panel.description}>
          {(description) => (
            <RichText
              key={id}
              value={description.value(shown)}
              editable={canEdit(shown, 'description')}
              storageKey={`intervio.collection.${definition.key}.${id}.description`}
              scope={recordScope(definition.key, id)}
              save={(text) =>
                save(shown, description.patch(text), {
                  label: t('collection:description.label'),
                  quiet: true, // its status line says Not saved, with Retry
                })
              }
            />
          )}
        </Show>

        {panel.properties.map((property) => {
          const field = property.field
          if (field?.type !== 'richText') return null
          return (
            <RichText
              key={`${id}-${property.id}`}
              label={t(property.label)}
              value={field.value(shown)}
              editable={canEdit(shown, property.id)}
              storageKey={`intervio.collection.${definition.key}.${id}.${property.id}`}
              scope={recordScope(definition.key, id)}
              save={(text) =>
                save(shown, field.patch(text), {
                  label: t(property.label),
                  quiet: true, // its status line says Not saved, with Retry
                })
              }
            />
          )
        })}

        <Show when={layout === 'panel'} className="flex flex-col gap-6">
          <WhenNear>
            <Sections
              definition={definition}
              panel={panel}
              record={shown}
              context={context}
            />
          </WhenNear>
        </Show>
      </div>

      <Show when={layout === 'page'}>
        <aside className="flex flex-col gap-6">
          <Sections
            definition={definition}
            panel={panel}
            record={shown}
            context={context}
          />
        </aside>
      </Show>
    </div>
  )
}

/**
 * Its content once it comes near the visible part of the panel: below the values and
 * the description, the linked records (and their requests) wait until the person
 * scrolls toward them, so opening a record doesn't build them.
 */
function WhenNear({ children }: { children: ReactNode }) {
  const [near, setNear] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (near || !element) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true)
      },
      { rootMargin: '200px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [near])
  return (
    <Show when={near} fallback={<div ref={ref} className="h-px" />}>
      {children}
    </Show>
  )
}

/** Grey bars where the record's title and properties will be. */
export function RecordPlaceholders({ label }: { label: string }) {
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
