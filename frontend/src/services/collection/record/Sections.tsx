import { Link2, Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, navigate } from '../../navigation'
import { Button, Match, Show, Switch } from '../../ui-kit'
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
import { LinkOrAdd } from './LinkOrAdd'
import { FoldTitle } from '../parts'

/** The linked records, each section with its first five. */
export function Sections<T, C>({
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
