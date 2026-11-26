import { ChevronDown, Table2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  ChoiceMenu,
  MenuPopover,
  MenuTrigger,
  Show,
  Tab,
  TabList,
  Tabs,
} from '../../ui-kit'
import type { ViewDefinition } from '../definition'

// ponytail: a fixed count; measure the row if long names crowd it.
const SHOWN = 5

/**
 * The collection's views as tabs above the toolbar (decision 167), each with its
 * type's icon; past five, the rest are in a "More" menu, and the view shown always
 * has its tab.
 */
export function ViewTabs({
  views,
  active,
  onChange,
}: {
  views: ViewDefinition[]
  active: string
  onChange: (id: string) => void
}) {
  const { t } = useTranslation()
  const first = views.slice(0, SHOWN)
  const shown = first.some((view) => view.id === active)
    ? first
    : [...first.slice(0, SHOWN - 1), ...views.filter((v) => v.id === active)]
  const more = views.filter((view) => !shown.includes(view))
  return (
    <div className="flex items-center gap-4 border-b border-border">
      <Tabs
        selectedKey={active}
        onSelectionChange={(key) => onChange(String(key))}
      >
        <TabList aria-label={t('collection:views.label')}>
          {shown.map((view) => (
            <Tab
              key={view.id}
              id={view.id}
              className="flex items-center gap-1.5"
            >
              <Table2 size={14} aria-hidden />
              {t(view.name)}
            </Tab>
          ))}
        </TabList>
      </Tabs>
      <Show as="span" when={more.length > 0}>
        <MenuTrigger>
          <Button size="sm" look="ghost">
            {t('collection:views.more', { count: more.length })}
            <ChevronDown size={14} />
          </Button>
          <MenuPopover>
            <ChoiceMenu
              label={t('collection:views.label')}
              mode="single"
              options={more.map((view) => ({
                id: view.id,
                label: t(view.name),
              }))}
              selected={[]}
              onChange={([id]) => id && onChange(id)}
            />
          </MenuPopover>
        </MenuTrigger>
      </Show>
    </div>
  )
}
