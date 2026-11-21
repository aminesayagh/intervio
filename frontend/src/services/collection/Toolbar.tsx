import { useRef, useState } from 'react'
import { MenuTrigger } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui-kit'
import type { FilterDefinition } from './definition'
import { Button, ChoiceMenu, MenuPopover } from './parts'
import { isNarrowed, type Listing } from './useCollectionState'

/** The delay between the last key typed and the search (spec 6.3). */
const SEARCH_DELAY = 250

/** Search, filter menus and "Clear filters", above the list (spec 4, 110). */
export function Toolbar({
  namespace,
  filters,
  listing,
  onSearch,
  onFilter,
  onClear,
}: {
  namespace: string
  filters: FilterDefinition[]
  listing: Listing
  onSearch: (search: string) => void
  onFilter: (id: string, values: string[]) => void
  onClear: () => void
}) {
  const { t } = useTranslation('collection')
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchField value={listing.search} onSearch={onSearch} />
      {filters.map((filter) => (
        <FilterMenu
          key={filter.id}
          namespace={namespace}
          filter={filter}
          chosen={listing.filters[filter.id] ?? []}
          onChange={(values) => onFilter(filter.id, values)}
        />
      ))}
      {isNarrowed(listing) && (
        <Button size="sm" look="ghost" onPress={onClear}>
          {t('clearFilters')}
        </Button>
      )}
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
    <label className="relative flex w-[320px] max-w-full items-center">
      <span className="pointer-events-none absolute start-3 flex text-muted">
        <Icon name="Search" size={16} />
      </span>
      <input
        type="search"
        aria-label={t('search')}
        placeholder={t('search')}
        value={text}
        onChange={(event) => type(event.target.value)}
        className="h-9 w-full rounded-[var(--field-radius)] border border-border bg-surface ps-9 pe-3 outline-none focus-visible:border-foreground"
      />
    </label>
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
        <Icon name="Arrow - Bottom-1" size={14} />
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
