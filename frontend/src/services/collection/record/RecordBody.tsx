import { Link2, Maximize2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, navigate } from '../../navigation'
import { Button, cn, Match, Show, Switch } from '../../ui-kit'
import { useCollectionQuery } from '../data/collectionQuery'
import type {
  AnyCollection,
  CollectionDefinition,
  PanelDefinition,
} from '../definition'
import { listPathOf } from '../definition'
import { drill } from '../drill/viewStack'
import { useOpenLinked } from './linked'
import { listAddress } from '../address'
import { recordScope } from '../data/recordActions'
import { RichText } from '../values/RichText'
import { EditableCell } from '../values/EditableCell'
import type { Id, ReportInvalid, SaveChange } from '../types'
import { LinkOrAdd } from './LinkOrAdd'
import { FoldTitle } from '../parts'
import { Properties } from './Properties'

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

/** The linked records, each section with its first five. */
function Sections<T, C>({
  definition,
  panel,
  record,
  context,
}: {
  definition: CollectionDefinition<T, C>
  panel: PanelDefinition<T>
  record: T
  context?: C
}) {
  const { t } = useTranslation([definition.i18n.namespace, 'collection'])
  // The strip of the view left names it: "Records · Pump specification" (spec 12.1).
  const viewName = `${t(definition.i18n.title)} · ${panel.title(record)}`
  // Spaced as the record's other parts, the texts (decision 159).
  return (
    <div className="flex flex-col gap-6">
      {panel.sections?.map((section) => (
        <Section
          key={section.id}
          id={section.id}
          label={t(section.label)}
          linked={section.collection()}
          scope={section.scope(record)}
          context={section.context?.(record, context)}
          viewName={viewName}
          // "+ Link or add" when the section says how to link, and the rights allow it.
          link={
            section.link &&
            (!definition.rights ||
              (definition.rights(record, context as C).add ?? []).includes(
                section.id,
              ))
              ? section.link(record)
              : undefined
          }
        />
      ))}
    </div>
  )
}

/** How many linked records a section shows; "Show all" opens the rest (decision 127). */
const PREVIEW = 5

/**
 * One section: the linked collection's records in its scope, loaded as its list loads
 * them, so "Show all" opens a list already in the cache.
 */
function Section({
  id,
  label,
  linked,
  scope,
  context,
  viewName,
  link,
}: {
  /** The section's id, kept in the address when its record opens (#70). */
  id: string
  label: string
  linked: AnyCollection
  scope: Record<string, string[]>
  /** The linked collection's context, when the section gives one. */
  context: unknown
  viewName: string
  /** The change that links a record here, when the person may link or add. */
  link?: Record<string, unknown>
}) {
  const { t } = useTranslation([linked.i18n.namespace, 'collection'])
  // In the panel, a linked record opens there (decision 137); on the full page, its
  // own full page opens.
  const openLinked = useOpenLinked()
  const linkedPath = listPathOf(linked, context)
  const list = useCollectionQuery({
    key: linked.key,
    source: linked.source,
    context,
    listing: { search: '', filters: scope, sort: [linked.defaultSort] },
  })
  const total = list.total ?? list.items.length
  const address = listAddress(linkedPath, scope)
  // Folded away by its title's triangle (decision 159).
  const [folded, setFolded] = useState(false)
  return (
    <section className="group/part">
      <FoldTitle
        icon={<Link2 size={14} />}
        label={label}
        folded={folded}
        onFold={() => setFolded(!folded)}
      >
        <Show as="span" when={total > PREVIEW} className="ms-auto">
          <Button
            size="sm"
            look="ghost"
            onPress={() => drill(address, viewName)}
          >
            {t('collection:section.showAll')}
            <Maximize2 size={14} />
          </Button>
        </Show>
      </FoldTitle>
      <Show when={!folded} className="mt-2">
        <Switch>
          <Match when={list.isPending}>
            <span
              role="status"
              aria-label={t('collection:loading')}
              className="flex flex-col gap-2"
            >
              <span className="block h-4 w-48 rounded-[var(--field-radius)] bg-default" />
              <span className="block h-4 w-36 rounded-[var(--field-radius)] bg-default" />
            </span>
          </Match>
          <Match when={list.isError && !list.data}>
            <p role="alert" className="flex items-center gap-3 text-muted">
              {t('collection:error.list')}
              <Button
                size="sm"
                look="secondary"
                onPress={() => void list.refetch()}
              >
                {t('collection:error.retry')}
              </Button>
            </p>
          </Match>
          <Match when={list.items.length === 0}>
            <p className="text-muted">{t('collection:section.empty')}</p>
          </Match>
          <Match when={list.items.length > 0}>
            <ul className="-mt-2 flex flex-col">
              {list.items.slice(0, PREVIEW).map((item) => (
                <li
                  key={linked.getId(item)}
                  className="flex items-center gap-2 border-b border-border py-2"
                >
                  <Show
                    as="span"
                    when={openLinked}
                    className="min-w-0 flex-1 truncate"
                    fallback={
                      <Link
                        href={
                          linked.opensAsPage?.(item, context) ??
                          `${linkedPath}/${encodeURIComponent(linked.getId(item))}`
                        }
                        className="block max-w-full truncate outline-none hover:underline focus-visible:underline"
                      >
                        {linked.panel?.title(item) ?? linked.getId(item)}
                      </Link>
                    }
                  >
                    {(open) => (
                      <button
                        type="button"
                        // A record people work inside opens its page (screen 51);
                        // Back returns here. Any other opens in this panel (137).
                        onClick={() => {
                          const page = linked.opensAsPage?.(item, context)
                          if (page) navigate(page)
                          else open(linked.key, linked.getId(item), id)
                        }}
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
          </Match>
        </Switch>
        <Show when={link} className="mt-1 flex">
          {(patch) => (
            <LinkOrAdd
              linked={linked}
              context={context}
              patch={patch}
              listAddress={address}
              viewName={viewName}
            />
          )}
        </Show>
      </Show>
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
