import { ChevronDown, Plus, SquarePlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActionMenu,
  Button,
  MenuPopover,
  MenuTrigger,
  PopoverDialog,
  Show,
} from '../../ui-kit'
import {
  applied,
  ruleCount,
  sameRules,
  type FilterField,
  type FilterGroup,
  withRule,
} from './rules'
import { Lines } from './filters/FilterLines'
import { fieldButton } from './filters/RuleLine'

/**
 * The Filter menu (decisions 149, 161): the rules in force, one per line ("Quantity
 * greater than 5"), joined by "and" or "or", and groups of rules with their own word
 * ("Status is Draft and (Owner is me or Quantity greater than 5)"). A new rule applies
 * once it has a value.
 */
export function FilterMenu({
  namespace,
  fields,
  group,
  onRules,
}: {
  namespace: string
  fields: FilterField[]
  /** The list's rules (scopes left out). */
  group: FilterGroup
  onRules: (group: FilterGroup) => void
}) {
  const { t } = useTranslation('collection')
  // The menu's own copy: a rule waiting for its value stays here, out of the address.
  const [local, setLocal] = useState(group)
  const [seen, setSeen] = useState(group)
  // The address changed from elsewhere (Clear filters, a link): follow it.
  if (!sameRules(group, seen)) {
    setSeen(group)
    if (!sameRules(group, local)) setLocal(group)
  }
  function change(next: FilterGroup) {
    setLocal(next)
    if (!sameRules(next, local)) onRules(applied(next))
  }
  const count = ruleCount(applied(group))
  const label = t('filter.title')
  return (
    <PopoverDialog
      label={label}
      width={600}
      placement="bottom end"
      trigger={
        <Button size="sm" aria-label={label}>
          {count ? `${label} (${count})` : label}
          <ChevronDown size={14} />
        </Button>
      }
    >
      <h2 className="text-base font-medium">{label}</h2>
      <Show when={local.rules.length > 0}>
        <Lines
          namespace={namespace}
          fields={fields}
          group={local}
          onChange={change}
        />
      </Show>
      <span className="flex flex-col items-start gap-2">
        <MenuTrigger>
          <Button size="sm" look="ghost" className={fieldButton}>
            <Plus size={14} />
            {t('filter.addMenu')}
          </Button>
          <MenuPopover minWidth={200}>
            <ActionMenu
              label={t('filter.addMenu')}
              actions={[
                {
                  id: 'rule',
                  label: t('filter.add'),
                  icon: <Plus size={14} />,
                },
                {
                  id: 'group',
                  label: t('filter.addGroup'),
                  icon: <SquarePlus size={14} />,
                },
              ]}
              onAction={(id) =>
                change(
                  id === 'rule'
                    ? withRule(local, fields)
                    : {
                        ...local,
                        rules: [
                          ...local.rules,
                          withRule({ join: 'and', rules: [] }, fields),
                        ],
                      },
                )
              }
            />
          </MenuPopover>
        </MenuTrigger>
        <Show when={local.rules.length === 0}>
          <p className="text-muted">{t('filter.none')}</p>
        </Show>
      </span>
    </PopoverDialog>
  )
}
