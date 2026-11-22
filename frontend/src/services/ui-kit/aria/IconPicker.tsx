import { useState } from 'react'
import {
  Dialog,
  DialogTrigger,
  ListBox,
  ListBoxItem,
  Popover,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Icon } from '../Icon'
import { Show } from '../views/Show'
import { Button, FieldButton } from './Button'
import { TextInput } from './TextField'

/** "triangle-alert" → "triangle alert": an icon's name in words, to search and to say. */
const words = (name: string) => name.replace(/-/g, ' ')

/**
 * Choosing an icon: the current one is the button; it opens a search field and a
 * grid of Lucide icons (a React Aria ListBox, so the arrow keys move through it),
 * with Remove when one is set. A choice closes the grid at once.
 */
export function IconPicker({
  label,
  value,
  options,
  onChange,
  look = 'cell',
}: {
  label: string
  /** A Lucide name ("wrench"), or null. */
  value: string | null
  options: string[]
  onChange: (name: string | null) => void
  look?: 'cell' | 'panel'
}) {
  const { t } = useTranslation('ui-kit')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const shown = options.filter((name) =>
    words(name).includes(query.trim().toLowerCase()),
  )
  function choose(name: string | null) {
    setOpen(false)
    setQuery('')
    onChange(name)
  }

  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      <FieldButton
        look={look}
        aria-label={`${label}: ${value ? words(value) : t('icons.none')}`}
      >
        <Show
          as="span"
          when={value}
          className="flex"
          fallback={<span className="text-muted">—</span>}
        >
          {(name) => <Icon name={`lucide/${name}`} size={16} />}
        </Show>
      </FieldButton>
      <Popover
        placement="bottom start"
        offset={4}
        className="w-[248px] rounded-[var(--field-radius)] border border-border bg-surface p-2 text-sm shadow-md outline-none"
      >
        <Dialog aria-label={label} className="flex flex-col gap-2 outline-none">
          <TextInput
            aria-label={t('icons.search')}
            placeholder={t('icons.search')}
            look="panel"
            value={query}
            onChange={setQuery}
            autoFocus
            className="mx-2"
          />
          <ListBox
            aria-label={label}
            layout="grid"
            selectionMode="single"
            selectedKeys={value ? [value] : []}
            onSelectionChange={(keys) => {
              const [name] = keys === 'all' ? [] : [...keys]
              if (name) choose(String(name))
            }}
            renderEmptyState={() => (
              <p className="py-2 text-muted">{t('icons.empty')}</p>
            )}
            className="grid max-h-[208px] grid-cols-6 gap-1 overflow-auto outline-none"
          >
            {shown.map((name) => (
              <ListBoxItem
                key={name}
                id={name}
                textValue={words(name)}
                aria-label={words(name)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-[var(--field-radius)] outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-foreground data-[hovered]:bg-default data-[selected]:bg-foreground data-[selected]:text-background"
              >
                <Icon name={`lucide/${name}`} size={16} />
              </ListBoxItem>
            ))}
          </ListBox>
          <Show when={value}>
            <Button look="ghost" size="sm" onPress={() => choose(null)}>
              {t('icons.remove')}
            </Button>
          </Show>
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}
