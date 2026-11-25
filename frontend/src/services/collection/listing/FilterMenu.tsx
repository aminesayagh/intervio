import { ChevronDown, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  ChoiceMenu,
  MenuPopover,
  MenuTrigger,
  PopoverDialog,
  Show,
  Variant,
} from '../../ui-kit'
import {
  applied,
  isGroup,
  OPERATORS,
  ruleCount,
  ruleKey,
  sameRules,
  type FilterField,
  type FilterGroup,
  type FilterKind,
  type Join,
  type Operator,
  type Rule,
} from './rules'

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
      width={560}
      placement="bottom end"
      trigger={
        <Button size="sm" aria-label={label}>
          {count ? `${label} (${count})` : label}
          <ChevronDown size={14} />
        </Button>
      }
    >
      <Show when={local.rules.length === 0}>
        <p className="text-muted">{t('filter.none')}</p>
      </Show>
      <Lines
        namespace={namespace}
        fields={fields}
        group={local}
        onChange={change}
      />
      <span className="flex gap-1">
        <Button
          size="sm"
          look="ghost"
          onPress={() => change(withRule(local, fields))}
        >
          <Plus size={14} />
          {t('filter.add')}
        </Button>
        <Button
          size="sm"
          look="ghost"
          onPress={() =>
            change({
              ...local,
              rules: [
                ...local.rules,
                withRule({ join: 'and', rules: [] }, fields),
              ],
            })
          }
        >
          <Plus size={14} />
          {t('filter.addGroup')}
        </Button>
      </span>
    </PopoverDialog>
  )
}

/** The group with a new rule at its end: the first field, its first condition, no value. */
function withRule(group: FilterGroup, fields: FilterField[]): FilterGroup {
  const [field] = fields
  const rule: Rule = { id: field.id, op: OPERATORS[field.kind][0], values: [] }
  return { ...group, rules: [...group.rules, rule] }
}

/**
 * A group's lines: "Where" before the first, the group's word before the others (a
 * choice on the second line, the same word after it), and a box for an inner group.
 */
function Lines({
  namespace,
  fields,
  group,
  onChange,
}: {
  namespace: string
  fields: FilterField[]
  group: FilterGroup
  onChange: (group: FilterGroup) => void
}) {
  const { t } = useTranslation('collection')
  const fieldOf = (id: string) => fields.find((field) => field.id === id)
  const put = (index: number, item: Rule | FilterGroup | null) =>
    onChange({
      ...group,
      rules: group.rules.flatMap((old, i) =>
        i !== index ? [old] : item ? [item] : [],
      ),
    })
  const joins: Join[] = ['and', 'or']
  return (
    <ul className="flex flex-col gap-2">
      {/* By place: a new rule keeps its line (and the focus) once it applies. */}
      {group.rules.map((item, index) => (
        <li key={index} className="flex items-start gap-1">
          <span className="flex h-8 w-16 shrink-0 items-center">
            <Variant<'where' | 'choice' | 'word'>
              value={index === 0 ? 'where' : index === 1 ? 'choice' : 'word'}
              views={{
                where: () => <span className="ps-2">{t('filter.where')}</span>,
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
                  />
                ),
                word: () => (
                  <span className="ps-2 text-muted">
                    {t(`filter.${group.join}`)}
                  </span>
                ),
              }}
            />
          </span>
          <Show
            when={isGroup(item) && item}
            className="flex min-w-0 flex-1 items-center gap-1"
            fallback={
              <RuleLine
                namespace={namespace}
                fields={fields}
                rule={item as Rule}
                field={fieldOf((item as Rule).id) ?? fields[0]}
                onChange={(next) => put(index, next)}
                onRemove={() => put(index, null)}
              />
            }
          >
            {(inner) => (
              <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-[var(--field-radius)] border border-border p-2">
                <Lines
                  namespace={namespace}
                  fields={fields}
                  group={inner}
                  onChange={(next) => put(index, next)}
                />
                <span className="flex justify-between">
                  <Button
                    size="sm"
                    look="ghost"
                    onPress={() => put(index, withRule(inner, fields))}
                  >
                    <Plus size={14} />
                    {t('filter.add')}
                  </Button>
                  <Button
                    size="sm"
                    look="ghost"
                    onPress={() => put(index, null)}
                  >
                    <X size={14} />
                    {t('filter.removeGroup')}
                  </Button>
                </span>
              </div>
            )}
          </Show>
        </li>
      ))}
    </ul>
  )
}

/** One rule: its field, its operator, its value, and × to remove it. */
function RuleLine({
  namespace,
  fields,
  rule,
  field,
  onChange,
  onRemove,
}: {
  namespace: string
  fields: FilterField[]
  rule: Rule
  field: FilterField
  onChange: (rule: Rule) => void
  onRemove: () => void
}) {
  const { t } = useTranslation([namespace, 'collection'])
  const fieldLabel = t(field.label)
  return (
    <>
      <Pick
        label={t('collection:filter.field')}
        text={fieldLabel}
        options={fields.map((f) => ({ id: f.id, label: t(f.label) }))}
        selected={rule.id}
        onChange={(id) => {
          const next = fields.find((f) => f.id === id)!
          // Another field: its first operator, no value yet.
          onChange({ id, op: OPERATORS[next.kind][0], values: [] })
        }}
      />
      <Pick
        label={t('collection:filter.operator')}
        text={opLabel(t, field.kind, rule.op)}
        options={OPERATORS[field.kind].map((op) => ({
          id: op,
          label: opLabel(t, field.kind, op),
        }))}
        selected={rule.op}
        onChange={(op) => onChange({ ...rule, op: op as Operator })}
      />
      <span className="flex min-w-0 flex-1">
        <RuleValue
          namespace={namespace}
          field={field}
          rule={rule}
          label={fieldLabel}
          onChange={(values) => onChange({ ...rule, values })}
        />
      </span>
      <Button
        size="sm"
        look="ghost"
        aria-label={t('collection:filter.remove', { name: fieldLabel })}
        onPress={onRemove}
        className="px-2"
      >
        <X size={14} />
      </Button>
    </>
  )
}

/** The value of a rule, as its kind takes it: chosen from a list, or typed. */
function RuleValue({
  namespace,
  field,
  rule,
  label,
  onChange,
}: {
  namespace: string
  field: FilterField
  rule: Rule
  label: string
  onChange: (values: string[]) => void
}) {
  const { t } = useTranslation([namespace, 'collection'])
  const options = field.options ?? []
  const many = rule.op === 'is' || rule.op === 'not'
  const chosen = options
    .filter((option) => rule.values.includes(option.id))
    .map((option) => t(option.label))
  const pick = () => (
    <Pick
      label={label}
      text={chosen.join(', ') || t('collection:filter.choose')}
      options={options.map((option) => ({
        id: option.id,
        label: t(option.label),
      }))}
      selected={rule.values}
      multiple={many && field.kind !== 'check'}
      onChange={(id, all) => onChange(all ?? [id])}
      grow
    />
  )
  const typed = (type: 'text' | 'number' | 'date') => () => (
    <TypedValue
      key={ruleKey(rule.id, rule.op)}
      type={type}
      label={label}
      value={rule.values[0] ?? ''}
      onChange={(value) => onChange(value ? [value] : [])}
    />
  )
  return (
    <Variant<FilterKind>
      value={field.kind}
      className="flex min-w-0 flex-1"
      views={{
        choice: pick,
        tags: pick,
        check: pick,
        text: typed('text'),
        number: typed('number'),
        date: typed('date'),
      }}
    />
  )
}

/** A typed value, applied when the field is left or Enter is pressed. */
function TypedValue({
  type,
  label,
  value,
  onChange,
}: {
  type: 'text' | 'number' | 'date'
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation('collection')
  const [text, setText] = useState(value)
  const apply = () => {
    if (text.trim() !== value) onChange(text.trim())
  }
  return (
    <input
      type={type}
      aria-label={label}
      placeholder={t('filter.value')}
      value={text}
      autoFocus={value === ''}
      onChange={(event) => setText(event.target.value)}
      onBlur={apply}
      onKeyDown={(event) => event.key === 'Enter' && apply()}
      className="h-8 w-full min-w-0 rounded-[var(--field-radius)] border border-border bg-surface px-2 outline-none focus-visible:border-foreground"
    />
  )
}

/** A small menu button showing its choice: a field, an operator, or values. */
function Pick({
  label,
  text,
  options,
  selected,
  onChange,
  multiple = false,
  grow = false,
}: {
  label: string
  text: string
  options: { id: string; label: string }[]
  selected: string | string[]
  onChange: (id: string, all?: string[]) => void
  multiple?: boolean
  grow?: boolean
}) {
  const ids = Array.isArray(selected) ? selected : [selected]
  return (
    <MenuTrigger>
      <Button
        size="sm"
        aria-label={label}
        className={grow ? 'min-w-0 flex-1 justify-between' : 'shrink-0'}
      >
        <span className="truncate">{text}</span>
        <ChevronDown size={14} />
      </Button>
      <MenuPopover>
        <ChoiceMenu
          label={label}
          mode={multiple ? 'multiple' : 'single'}
          options={options}
          selected={ids}
          onChange={(next) =>
            multiple
              ? onChange(next[0] ?? '', next)
              : // A single menu gives the new choice only (or none when it is pressed again).
                next[0] && onChange(next[0])
          }
        />
      </MenuPopover>
    </MenuTrigger>
  )
}

/** "is", "contains", "greater than"; for a date "on", "after", "before". */
function opLabel(t: (key: string) => string, kind: FilterKind, op: Operator) {
  return t(
    kind === 'date'
      ? `collection:filter.op.date.${op}`
      : `collection:filter.op.${op}`,
  )
}
