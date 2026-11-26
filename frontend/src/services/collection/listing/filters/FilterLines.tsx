import { Copy, Ellipsis, Group, Plus, Trash2, Ungroup } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  ActionMenu,
  Button,
  MenuPopover,
  MenuTrigger,
  Show,
  Variant,
} from '../../../ui-kit'
import {
  isGroup,
  type FilterField,
  type FilterGroup,
  type Join,
  type Rule,
  withRule,
} from '../rules'
import { Pick, RuleLine } from './RuleLine'

/**
 * A group's lines: "Where" before the first, the group's word before the others (a
 * choice on the second line, the same word after it), a grey box for an inner group,
 * and ⋯ at the end of each line for its actions.
 */
export function Lines({
  namespace,
  fields,
  group,
  onChange,
  inner = false,
}: {
  namespace: string
  fields: FilterField[]
  group: FilterGroup
  onChange: (group: FilterGroup) => void
  /** Inside a group: its lines can't be grouped again (one level). */
  inner?: boolean
}) {
  const { t } = useTranslation('collection')
  const fieldOf = (id: string) => fields.find((field) => field.id === id)
  /** Puts these items in place of the one at `index` (none removes it). */
  const put = (index: number, ...items: (Rule | FilterGroup)[]) =>
    onChange({
      ...group,
      rules: group.rules.flatMap((old, i) => (i !== index ? [old] : items)),
    })
  function act(index: number, id: string) {
    const item = group.rules[index]
    if (id === 'duplicate') put(index, item, structuredClone(item))
    if (id === 'wrap') put(index, { join: 'and', rules: [item] })
    if (id === 'ungroup' && isGroup(item)) put(index, ...item.rules)
    if (id === 'remove') put(index)
  }
  const actionsOf = (item: Rule | FilterGroup) => [
    { id: 'duplicate', label: t('filter.duplicate'), icon: <Copy size={14} /> },
    ...(isGroup(item)
      ? [
          {
            id: 'ungroup',
            label: t('filter.ungroup'),
            icon: <Ungroup size={14} />,
          },
        ]
      : inner
        ? []
        : [{ id: 'wrap', label: t('filter.wrap'), icon: <Group size={14} /> }]),
    {
      id: 'remove',
      label: t(isGroup(item) ? 'filter.removeGroup' : 'filter.removeRule'),
      icon: <Trash2 size={14} />,
      danger: true,
    },
  ]
  const joins: Join[] = ['and', 'or']
  return (
    <ul className="flex flex-col gap-2">
      {/* By place: a new rule keeps its line (and the focus) once it applies. */}
      {group.rules.map((item, index) => (
        <li key={index} className="flex items-start gap-2">
          {/* One width for "Where", the choice and the word, so the rules line up. */}
          <span className="flex h-8 w-[4.5rem] shrink-0 items-center">
            <Variant<'where' | 'choice' | 'word'>
              value={index === 0 ? 'where' : index === 1 ? 'choice' : 'word'}
              className="flex w-full"
              views={{
                where: () => (
                  <span className="px-2.5">{t('filter.where')}</span>
                ),
                choice: () => (
                  <Pick
                    label={t('filter.join')}
                    text={t(`filter.${group.join}`)}
                    options={joins.map((id) => ({
                      id,
                      label: t(`filter.${id}`),
                    }))}
                    selected={group.join}
                    onChange={(join) =>
                      onChange({ ...group, join: join as Join })
                    }
                    className="w-full justify-between"
                  />
                ),
                word: () => (
                  <span className="px-2.5">{t(`filter.${group.join}`)}</span>
                ),
              }}
            />
          </span>
          <Show
            when={isGroup(item) && item}
            className="flex min-w-0 flex-1 items-center gap-2"
            fallback={
              <RuleLine
                namespace={namespace}
                fields={fields}
                rule={item as Rule}
                field={fieldOf((item as Rule).id) ?? fields[0]}
                onChange={(next) => put(index, next)}
              />
            }
          >
            {(box) => (
              <div className="flex min-w-0 flex-1 flex-col items-start gap-2 rounded-[var(--field-radius)] bg-default/60 p-2">
                <Lines
                  namespace={namespace}
                  fields={fields}
                  group={box}
                  onChange={(next) => put(index, next)}
                  inner
                />
                <Button
                  size="sm"
                  look="ghost"
                  onPress={() => put(index, withRule(box, fields))}
                >
                  <Plus size={14} />
                  {t('filter.addMenu')}
                </Button>
              </div>
            )}
          </Show>
          <MenuTrigger>
            <Button
              look="ghost"
              size="sm"
              aria-label={t('filter.actions')}
              className="h-8 min-w-8 px-2"
            >
              <Ellipsis size={14} />
            </Button>
            <MenuPopover minWidth={200}>
              <ActionMenu
                label={t('filter.actions')}
                actions={actionsOf(item)}
                onAction={(id) => act(index, id)}
              />
            </MenuPopover>
          </MenuTrigger>
        </li>
      ))}
    </ul>
  )
}
