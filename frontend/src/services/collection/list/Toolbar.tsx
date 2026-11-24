import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Search,
  X,
} from 'lucide-react'
import { createElement, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Checkbox,
  ChoiceMenu,
  MenuPopover,
  MenuTrigger,
  PopoverDialog,
  Show,
} from '../../ui-kit'
import { useQuery } from '@tanstack/react-query'
import { keys } from '../data/collectionQuery'
import type { FilterDefinition, ScopeDefinition } from '../definition'
import type { SortDirection } from '../types'
import { isNarrowed, nextSort, type Listing } from './useCollectionState'

/** The delay between the last key typed and the search (spec 6.3). */
const SEARCH_DELAY = 250

/** Search, filter menus and "Clear filters", above the list (spec 4, 110). */
export function Toolbar({
  namespace,
  filters,
  scopes = [],
  listing,
  onSearch,
  onFilter,
  onClear,
  narrow,
}: {
  namespace: string
  filters: FilterDefinition[]
  scopes?: ScopeDefinition[]
  listing: Listing
  onSearch: (search: string) => void
  onFilter: (id: string, values: string[]) => void
  onClear: () => void
  /**
   * Narrow screens (decision 121): the filters, and the sort (the rows have no
   * headers), sit behind one "Filters" button.
   */
  narrow?: {
    sorts: { id: string; label: string; first: SortDirection }[]
    onSort: (sort: Listing['sort']) => void
  }
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
              onFilter(
                scope.id,
                (listing.filters[scope.id] ?? []).filter(
                  (id) => id !== parentId,
                ),
              )
            }
          />
        )),
      )}
      <Show
        as="span"
        className="contents"
        when={narrow}
        fallback={
          <>
            {filters.map((filter) => (
              <FilterMenu
                key={filter.id}
                namespace={namespace}
                filter={filter}
                chosen={listing.filters[filter.id] ?? []}
                onChange={(values) => onFilter(filter.id, values)}
              />
            ))}
            <Show when={isNarrowed(unscoped)}>
              <Button size="sm" look="ghost" onPress={onClear}>
                {t('clearFilters')}
              </Button>
            </Show>
          </>
        }
      >
        {(fold) => (
          <FiltersPanel
            namespace={namespace}
            filters={filters}
            listing={listing}
            unscoped={unscoped}
            sorts={fold.sorts}
            onSort={fold.onSort}
            onFilter={onFilter}
            onClear={onClear}
          />
        )}
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
 * Narrow screens: one "Filters" button (with how many are chosen) opening a panel
 * with the sort first, then each filter's options, then Clear filters.
 */
function FiltersPanel({
  namespace,
  filters,
  listing,
  unscoped,
  sorts,
  onSort,
  onFilter,
  onClear,
}: {
  namespace: string
  filters: FilterDefinition[]
  listing: Listing
  unscoped: Listing
  sorts: { id: string; label: string; first: SortDirection }[]
  onSort: (sort: Listing['sort']) => void
  onFilter: (id: string, values: string[]) => void
  onClear: () => void
}) {
  const { t } = useTranslation([namespace, 'collection'])
  const chosen = Object.values(unscoped.filters).reduce(
    (count, values) => count + values.length,
    0,
  )
  const label = t('collection:filters')
  return (
    <PopoverDialog
      label={label}
      trigger={
        <Button size="sm" aria-label={label}>
          {chosen ? `${label} (${chosen})` : label}
          <ChevronDown size={14} />
        </Button>
      }
    >
      <Show when={sorts.length > 0} className="flex flex-col gap-1">
        <h3 className="text-xs text-muted">{t('collection:sortTitle')}</h3>
        <span className="flex flex-wrap gap-1">
          {sorts.map((sort) => {
            const direction =
              listing.sort?.by === sort.id ? listing.sort.direction : null
            return (
              <Button
                key={sort.id}
                size="sm"
                look={direction ? 'secondary' : 'ghost'}
                aria-pressed={direction !== null}
                onPress={() =>
                  onSort(nextSort(listing.sort, sort.id, sort.first))
                }
              >
                {t(sort.label)}
                {createElement(
                  direction === 'asc'
                    ? ArrowUp
                    : direction === 'desc'
                      ? ArrowDown
                      : ArrowUpDown,
                  { size: 12 },
                )}
              </Button>
            )
          })}
        </span>
      </Show>
      {filters.map((filter) => {
        const values = listing.filters[filter.id] ?? []
        return (
          <section key={filter.id} className="flex flex-col gap-2">
            <h3 className="text-xs text-muted">{t(filter.label)}</h3>
            {filter.options.map((option) => (
              <Checkbox
                key={option.id}
                label={t(option.label)}
                isSelected={values.includes(option.id)}
                onChange={(on) =>
                  onFilter(
                    filter.id,
                    on
                      ? [...values, option.id]
                      : values.filter((value) => value !== option.id),
                  )
                }
              />
            ))}
          </section>
        )
      })}
      <Show when={isNarrowed(unscoped)}>
        <Button size="sm" look="ghost" onPress={onClear} className="self-start">
          {t('collection:clearFilters')}
        </Button>
      </Show>
    </PopoverDialog>
  )
}

/** A filter: a menu of check boxes; its button shows how many are chosen. */
function FilterMenu({
  namespace,
  filter,
  chosen,
  onChange,
}: {
  namespace: string
  filter: FilterDefinition
  chosen: string[]
  onChange: (values: string[]) => void
}) {
  const { t } = useTranslation(namespace)
  const label = t(filter.label)
  return (
    <MenuTrigger>
      <Button size="sm" aria-label={label}>
        {chosen.length ? `${label} (${chosen.length})` : label}
        <ChevronDown size={14} />
      </Button>
      <MenuPopover>
        <ChoiceMenu
          label={label}
          mode="multiple"
          options={filter.options.map((option) => ({
            id: option.id,
            label: t(option.label),
          }))}
          selected={chosen}
          onChange={onChange}
        />
      </MenuPopover>
    </MenuTrigger>
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
