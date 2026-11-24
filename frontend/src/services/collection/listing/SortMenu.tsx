import { ArrowDown, ArrowUp, ChevronDown, Plus, X } from 'lucide-react'
import { createElement } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  ChoiceMenu,
  MenuPopover,
  MenuTrigger,
  PopoverDialog,
  Show,
} from '../../ui-kit'
import type { Sort, SortDirection } from '../types'

/** A column the list can be sorted by, and the direction it starts in. */
export type Sortable = { id: string; label: string; first: SortDirection }

/**
 * The Sort menu (decision 149): the sort levels, the first one first ("Status ↑, then
 * Updated ↓"), each with its column, its direction and ×; "+ Add a sort" adds the next
 * column not yet used. Without a level, the collection's default order applies.
 */
export function SortMenu({
  namespace,
  sortables,
  sort,
  onSort,
}: {
  namespace: string
  sortables: Sortable[]
  sort: Sort[]
  onSort: (sort: Sort[]) => void
}) {
  const { t } = useTranslation([namespace, 'collection'])
  const unused = sortables.filter(
    (column) => !sort.some((level) => level.by === column.id),
  )
  const set = (index: number, level: Sort | null) =>
    onSort(
      sort.flatMap((current, i) =>
        i === index ? (level ? [level] : []) : [current],
      ),
    )
  const label = t('collection:sort.title')
  return (
    <PopoverDialog
      label={label}
      width={340}
      placement="bottom end"
      trigger={
        <Button size="sm" aria-label={label}>
          {sort.length ? `${label} (${sort.length})` : label}
          <ChevronDown size={14} />
        </Button>
      }
    >
      <Show when={sort.length === 0}>
        <p className="text-muted">{t('collection:sort.none')}</p>
      </Show>
      <ol className="flex flex-col gap-2">
        {sort.map((level, index) => {
          const column = sortables.find((c) => c.id === level.by)
          const name = column ? t(column.label) : level.by
          const choices = sortables.filter(
            (c) => c.id === level.by || unused.includes(c),
          )
          return (
            <li key={level.by} className="flex items-center gap-1">
              <MenuTrigger>
                <Button
                  size="sm"
                  aria-label={t('collection:sort.column', { n: index + 1 })}
                  className="min-w-0 flex-1 justify-between"
                >
                  <span className="truncate">{name}</span>
                  <ChevronDown size={14} />
                </Button>
                <MenuPopover>
                  <ChoiceMenu
                    label={t('collection:sort.column', { n: index + 1 })}
                    mode="single"
                    options={choices.map((c) => ({
                      id: c.id,
                      label: t(c.label),
                    }))}
                    selected={[level.by]}
                    onChange={([by]) => {
                      const next = sortables.find((c) => c.id === by)
                      if (next) set(index, { by, direction: next.first })
                    }}
                  />
                </MenuPopover>
              </MenuTrigger>
              <Button
                size="sm"
                look="ghost"
                onPress={() =>
                  set(index, {
                    ...level,
                    direction: level.direction === 'asc' ? 'desc' : 'asc',
                  })
                }
              >
                {createElement(
                  level.direction === 'asc' ? ArrowUp : ArrowDown,
                  {
                    size: 14,
                  },
                )}
                {t(`collection:sort.${level.direction}`)}
              </Button>
              <Button
                size="sm"
                look="ghost"
                aria-label={t('collection:sort.remove', { name })}
                onPress={() => set(index, null)}
                className="px-2"
              >
                <X size={14} />
              </Button>
            </li>
          )
        })}
      </ol>
      <Show when={unused.length > 0}>
        <Button
          size="sm"
          look="ghost"
          className="self-start"
          onPress={() =>
            onSort([...sort, { by: unused[0].id, direction: unused[0].first }])
          }
        >
          <Plus size={14} />
          {t('collection:sort.add')}
        </Button>
      </Show>
    </PopoverDialog>
  )
}
