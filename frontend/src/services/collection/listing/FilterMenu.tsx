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
  OPERATORS,
  readRule,
  ruleKey,
  type FilterField,
  type FilterKind,
  type Operator,
  type Rule,
} from './rules'

/**
 * The Filter menu (decision 149): the rules in force, one per line ("Quantity greater
 * than 5"), each with its field, operator and value; "+ Add a filter" starts a new one,
 * which applies once it has a value. Every rule must match.
 */
export function FilterMenu({
  namespace,
  fields,
  filters,
  onFilters,
}: {
  namespace: string
  fields: FilterField[]
  /** The list's filters (rule key → values); scopes are among them, and left out here. */
  filters: Record<string, string[]>
  /** Sets several rule keys at once (an empty list removes one). */
  onFilters: (patch: Record<string, string[]>) => void
}) {
  const { t } = useTranslation('collection')
  const fieldOf = (id: string) => fields.find((field) => field.id === id)
  const rules = Object.entries(filters)
    .map(([key, values]) => readRule(key, values))
    .filter((rule) => fieldOf(rule.id) && rule.values.length > 0)
  // A rule added, waiting for its value: not in the address yet.
  const [draft, setDraft] = useState<Rule | null>(null)

  function change(rule: Rule, next: Rule) {
    if (rule === draft && next.values.length === 0) return setDraft(next)
    if (rule === draft) setDraft(null)
    const removed = ruleKey(rule.id, rule.op)
    const added = ruleKey(next.id, next.op)
    onFilters({
      ...(removed !== added && rule !== draft && { [removed]: [] }),
      [added]: next.values,
    })
  }
  function remove(rule: Rule) {
    if (rule === draft) setDraft(null)
    else onFilters({ [ruleKey(rule.id, rule.op)]: [] })
  }
  function add() {
    const [field] = fields
    setDraft({ id: field.id, op: OPERATORS[field.kind][0], values: [] })
  }

  const label = t('filter.title')
  const shown = draft ? [...rules, draft] : rules
  return (
    <PopoverDialog
      label={label}
      width={460}
      placement="bottom end"
      trigger={
        <Button size="sm" aria-label={label}>
          {rules.length ? `${label} (${rules.length})` : label}
          <ChevronDown size={14} />
        </Button>
      }
    >
      <Show when={shown.length === 0}>
        <p className="text-muted">{t('filter.none')}</p>
      </Show>
      <ul className="flex flex-col gap-2">
        {shown.map((rule) => (
          <li
            key={rule === draft ? '\0draft' : ruleKey(rule.id, rule.op)}
            className="flex items-center gap-1"
          >
            <RuleLine
              namespace={namespace}
              fields={fields}
              rule={rule}
              field={fieldOf(rule.id)!}
              onChange={(next) => change(rule, next)}
              onRemove={() => remove(rule)}
            />
          </li>
        ))}
      </ul>
      <Show when={draft === null && fields.length > 0}>
        <Button size="sm" look="ghost" onPress={add} className="self-start">
          <Plus size={14} />
          {t('filter.add')}
        </Button>
      </Show>
    </PopoverDialog>
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
function opLabel(
  t: (key: string) => string,
  kind: FilterKind,
  op: Operator,
) {
  return t(
    kind === 'date' ? `collection:filter.op.date.${op}` : `collection:filter.op.${op}`,
  )
}
