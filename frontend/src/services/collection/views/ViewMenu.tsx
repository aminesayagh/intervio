import { ChevronDown, Table2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  CommandSearch,
  MenuPopover,
  MenuTrigger,
  Show,
} from '../../ui-kit'
import type { ViewDefinition } from '../definition'

/**
 * The view shown, beside the collection's title (decision 169): with several views,
 * a button whose menu lists them under a search field; with one, only its name.
 * Views are configured by the app, so the menu offers no "Add view".
 */
export function ViewMenu({
  views,
  active,
  onChange,
}: {
  views: ViewDefinition[]
  active: ViewDefinition
  onChange: (id: string) => void
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const name = (
    <>
      <Table2 size={14} aria-hidden />
      {t(active.name)}
    </>
  )
  return (
    <Show
      as="span"
      // A box of its own: inline, the button would sit on the text's baseline.
      className="flex items-center"
      when={views.length > 1}
      fallback={
        <span className="flex items-center gap-1.5 text-muted">{name}</span>
      }
    >
      <MenuTrigger onOpenChange={() => setSearch('')}>
        <Button
          size="sm"
          look="ghost"
          aria-label={t('collection:views.choose', { name: t(active.name) })}
          className="gap-1.5 text-muted"
        >
          {name}
          <ChevronDown size={14} />
        </Button>
        <MenuPopover minWidth={240}>
          <CommandSearch
            label={t('collection:views.label')}
            placeholder={t('collection:views.search')}
            empty={t('collection:views.none')}
            commands={views.map((view) => ({
              id: view.id,
              label: t(view.name),
              icon: <Table2 size={14} />,
            }))}
            value={search}
            onChange={setSearch}
            onAction={onChange}
          />
        </MenuPopover>
      </MenuTrigger>
    </Show>
  )
}
