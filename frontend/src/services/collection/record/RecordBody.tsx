import { useTranslation } from 'react-i18next'
import { Button, cn, Icon, Show } from '../../ui-kit'
import { useCollectionQuery } from '../data/collectionQuery'
import type {
  AnyCollection,
  CollectionDefinition,
  PanelDefinition,
} from '../definition'
import { drill } from '../drill/viewStack'
import { useOpenLinked } from './linked'
import { listAddress } from '../address'
import { Description } from '../values/Description'
import { EditableCell } from '../values/EditableCell'
import type { Id, ReportInvalid, SaveChange } from '../types'
import { ValueField } from '../values/ValueField'

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
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  return (
    <div
      className={cn(
        layout === 'page' &&
          'grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start gap-12',
      )}
    >
      <div className="flex flex-col gap-6 pt-2 pb-8">
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

        <dl className="grid grid-cols-[176px_minmax(0,1fr)] gap-x-4 gap-y-3">
          {panel.properties
            .filter((property) => property.field?.type !== 'richText')
            .map((property) => (
              <div key={property.id} className="contents">
                <dt className="text-muted">{t(property.label)}</dt>
                <dd className="min-w-0">
                  <ValueField
                    record={shown}
                    field={property.field}
                    allowed={canEdit(shown, property.id)}
                    read={property.value}
                    label={t(property.label)}
                    namespace={definition.i18n.namespace}
                    save={(patch) =>
                      save(shown, patch, { label: t(property.label) })
                    }
                    onInvalid={(reason) =>
                      report(shown, t(property.label), reason)
                    }
                    look="panel"
                  />
                </dd>
              </div>
            ))}
        </dl>

        <Show when={panel.description}>
          {(description) => (
            <Description
              key={id}
              value={description.value(shown)}
              editable={canEdit(shown, 'description')}
              storageKey={`intervio.collection.${definition.key}.${id}.description`}
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
            <Description
              key={`${id}-${property.id}`}
              label={t(property.label)}
              value={field.value(shown)}
              editable={canEdit(shown, property.id)}
              storageKey={`intervio.collection.${definition.key}.${id}.${property.id}`}
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
          <Sections definition={definition} panel={panel} record={shown} />
        </Show>
      </div>

      <Show when={layout === 'page'}>
        <aside className="flex flex-col gap-6">
          <Sections definition={definition} panel={panel} record={shown} />
        </aside>
      </Show>
    </div>
  )
}

/** The linked records, each section with its first five. */
function Sections<T, C>({
  definition,
  panel,
  record,
}: {
  definition: CollectionDefinition<T, C>
  panel: PanelDefinition<T>
  record: T
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  // The strip of the view left names it: "Records · Pump specification" (spec 12.1).
  const viewName = `${t(definition.i18n.title)} · ${panel.title(record)}`
  return (
    <>
      {panel.sections?.map((section) => (
        <Section
          key={section.id}
          label={t(section.label)}
          linked={section.collection()}
          scope={section.scope(record)}
          viewName={viewName}
        />
      ))}
    </>
  )
}

/** How many linked records a section shows; "Show all" opens the rest (decision 127). */
const PREVIEW = 5

/**
 * One section: the linked collection's records in its scope, loaded as its list loads
 * them, so "Show all" opens a list already in the cache.
 */
function Section({
  label,
  linked,
  scope,
  viewName,
}: {
  label: string
  linked: AnyCollection
  scope: Record<string, string[]>
  viewName: string
}) {
  const { t } = useTranslation([linked.i18n.namespace, 'collection'])
  // In the panel, a linked record opens there (decision 137); on the full page it is text.
  const openLinked = useOpenLinked()
  // ponytail: the linked collection gets no context; add one to the section when a
  // real collection needs it.
  const list = useCollectionQuery({
    key: linked.key,
    source: linked.source,
    context: undefined,
    listing: { search: '', filters: scope, sort: linked.defaultSort },
  })
  const total = list.total ?? list.items.length
  const address = listAddress(linked.basePath ?? `/${linked.key}`, scope)
  return (
    <section className="border-t border-border pt-4">
      <h3 className="flex items-baseline gap-2 font-medium">
        {label}
        <Show
          as="span"
          when={list.data}
          className="text-xs font-normal text-muted"
        >
          {total}
        </Show>
        <Show as="span" when={total > PREVIEW} className="ms-auto">
          <Button
            size="sm"
            look="ghost"
            onPress={() => drill(address, viewName)}
          >
            {t('collection:section.showAll')}
            <Icon name="lucide/maximize-2" size={14} />
          </Button>
        </Show>
      </h3>
      <ul className="mt-2 flex flex-col">
        {list.items.slice(0, PREVIEW).map((item) => (
          <li
            key={linked.getId(item)}
            className="flex items-center gap-2 border-b border-border py-2"
          >
            <Show
              as="span"
              when={openLinked}
              className="min-w-0 flex-1 truncate"
              fallback={linked.panel?.title(item) ?? linked.getId(item)}
            >
              {(open) => (
                <button
                  type="button"
                  onClick={() => open(linked.key, linked.getId(item))}
                  className="max-w-full cursor-pointer truncate text-start outline-none hover:underline focus-visible:underline"
                >
                  {linked.panel?.title(item) ?? linked.getId(item)}
                </button>
              )}
            </Show>
            {linked.panel?.type(item)}
          </li>
        ))}
      </ul>
    </section>
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
