import { Search, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Show } from '../../ui-kit'
import { useQuery } from '@tanstack/react-query'
import { keys } from '../data/collectionQuery'
import type { ScopeDefinition } from '../definition'
import { FilterMenu } from '../listing/FilterMenu'
import { groupOf, type FilterField, type FilterGroup } from '../listing/rules'
import { SortMenu, type Sortable } from '../listing/SortMenu'
import type { Sort } from '../types'
import { isNarrowed, type Listing } from './useCollectionState'

/** The delay between the last key typed and the search (spec 6.3). */
const SEARCH_DELAY = 250

/**
 * Search, the scope's chip, the Filter and Sort menus and "Clear filters", above the
 * list (spec 4, decision 149); the same on narrow screens.
 */
export function Toolbar({
  namespace,
  fields,
  sortables,
  scopes = [],
  listing,
  onSearch,
  onFilters,
  onRules,
  onSort,
  onClear,
}: {
  namespace: string
  fields: FilterField[]
  sortables: Sortable[]
  scopes?: ScopeDefinition[]
  listing: Listing
  onSearch: (search: string) => void
  onFilters: (patch: Record<string, string[]>) => void
  onRules: (group: FilterGroup) => void
  onSort: (sort: Sort[]) => void
  onClear: () => void
}) {
  const { t } = useTranslation('collection')
  // "Clear filters" leaves the scope: only its chip's × removes it (spec 12.1).
  const scopeIds = new Set(scopes.map((scope) => scope.id))
  const unscoped = {
    ...listing,
    filters: Object.fromEntries(
      Object.entries(listing.filters).filter(([id]) => !scopeIds.has(id)),
    ),
  }
  // The menu's rules: the plain ones, then the composed ones (a link may hold both).
  const plain = groupOf(unscoped.filters)
  const where = listing.where
  const group: FilterGroup = !where
    ? plain
    : plain.rules.length === 0
      ? where
      : {
          join: 'and',
          rules: [
            ...plain.rules,
            ...(where.join === 'and' ? where.rules : [where]),
          ],
        }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchField value={listing.search} onSearch={onSearch} />
      {scopes.flatMap((scope) =>
        (listing.filters[scope.id] ?? []).map((parentId) => (
          <ScopeChip
            key={`${scope.id}:${parentId}`}
            namespace={namespace}
            scope={scope}
            parentId={parentId}
            onRemove={() =>
              onFilters({
                [scope.id]: (listing.filters[scope.id] ?? []).filter(
                  (id) => id !== parentId,
                ),
              })
            }
          />
        )),
      )}
      <Show as="span" className="contents" when={fields.length > 0}>
        <FilterMenu
          namespace={namespace}
          fields={fields}
          group={group}
          onRules={onRules}
        />
      </Show>
      <Show as="span" className="contents" when={sortables.length > 0}>
        <SortMenu
          namespace={namespace}
          sortables={sortables}
          sort={listing.sort}
          onSort={onSort}
        />
      </Show>
      <Show as="span" className="contents" when={isNarrowed(unscoped)}>
        <Button size="sm" look="ghost" onPress={onClear}>
          {t('clearFilters')}
        </Button>
      </Show>
    </div>
  )
}

/**
 * Keeps exactly what the person typed (a trailing space stays), and searches it,
 * trimmed, SEARCH_DELAY after the last key. It takes the address's search only when
 * that changes from elsewhere: Clear filters, a link, the tab's last list.
 */
function SearchField({
  value,
  onSearch,
}: {
  value: string
  onSearch: (search: string) => void
}) {
  const { t } = useTranslation('collection')
  const [text, setText] = useState(value)
  const [seen, setSeen] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // The address changed: follow it, unless it is just the trimmed text typed here.
  if (value !== seen) {
    setSeen(value)
    if (value !== text.trim()) setText(value)
  }

  function type(next: string) {
    setText(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onSearch(next.trim()), SEARCH_DELAY)
  }

  return (
    <label className="relative flex w-60 max-w-full items-center">
      <span className="pointer-events-none absolute start-2.5 flex text-muted">
        <Search size={14} />
      </span>
      <input
        type="search"
        aria-label={t('search')}
        placeholder={t('search')}
        value={text}
        onChange={(event) => type(event.target.value)}
        className="h-8 w-full rounded-[var(--field-radius)] border border-border bg-surface ps-8 pe-3 outline-none focus-visible:border-foreground"
      />
    </label>
  )
}

/**
 * The scope "Show all" set (spec 12.1): "Linked to: Pump specification", with × to
 * see the whole collection. The parent's name comes from its own collection.
 */
function ScopeChip({
  namespace,
  scope,
  parentId,
  onRemove,
}: {
  namespace: string
  scope: ScopeDefinition
  parentId: string
  onRemove: () => void
}) {
  const { t } = useTranslation([namespace, 'collection'])
  const parent = scope.parent()
  const record = useQuery({
    queryKey: keys.record(parent.key, parentId),
    queryFn: () => parent.source.one(parentId, undefined),
  })
  const name = record.data
    ? (parent.panel?.title(record.data) ?? parentId)
    : '…'
  const label = t(scope.label, { name })
  return (
    <span className="flex h-8 items-center gap-1 rounded-[var(--field-radius)] bg-default ps-3 pe-1 text-sm">
      {label}
      <button
        type="button"
        aria-label={t('collection:scope.remove', { label })}
        onClick={onRemove}
        className="flex cursor-pointer items-center rounded-[var(--field-radius)] p-1 text-muted outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
      >
        <X size={14} />
      </button>
    </span>
  )
}
