import { Button, Dropdown, Label } from '@heroui/react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../ui-kit'
import type { FilterDefinition } from './definition'
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
        <Button size="sm" variant="ghost" onPress={onClear}>
          {t('clearFilters')}
        </Button>
      )}
    </div>
  )
}

/**
 * Shows the address's search, except while the person is typing: what they type
 * is searched SEARCH_DELAY after the last key.
 */
function SearchField({
  value,
  onSearch,
}: {
  value: string
  onSearch: (search: string) => void
}) {
  const { t } = useTranslation('collection')
  const [draft, setDraft] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  function type(next: string) {
    setDraft(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      onSearch(next)
      setDraft(null)
    }, SEARCH_DELAY)
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
        value={draft ?? value}
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
    <Dropdown>
      <Button size="sm" variant="secondary" aria-label={label}>
        {chosen.length ? `${label} (${chosen.length})` : label}
        <Icon name="Arrow - Bottom-1" size={14} />
      </Button>
      <Dropdown.Popover placement="bottom start" className="min-w-[200px]">
        <Dropdown.Menu
          aria-label={label}
          selectionMode="multiple"
          selectedKeys={new Set(chosen)}
          onSelectionChange={(keys) =>
            onChange(
              keys === 'all'
                ? filter.options.map((option) => option.id)
                : [...keys].map(String),
            )
          }
        >
          {filter.options.map((option) => (
            <Dropdown.Item
              key={option.id}
              id={option.id}
              textValue={t(option.label)}
            >
              <Label>{t(option.label)}</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
