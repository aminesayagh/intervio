import {
  Calendar,
  ChevronDown,
  CircleChevronDown,
  Hash,
  SquareCheck,
  Tags,
  Type,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  ChoiceMenu,
  cn,
  MenuPopover,
  MenuTrigger,
  Variant,
} from '../../../ui-kit'
import {
  OPERATORS,
  ruleKey,
  type FilterField,
  type FilterKind,
  type Operator,
  type Rule,
} from '../rules'

/** A choice in a rule: a white field with a thin border, as a typed value. */
export const fieldButton =
  'border border-border bg-surface px-2.5 font-normal data-[hovered]:bg-default'

/** The type of value a field holds, shown before its name. */
const KIND_ICON: Record<FilterKind, typeof Type> = {
  text: Type,
  number: Hash,
  date: Calendar,
  choice: CircleChevronDown,
  tags: Tags,
  check: SquareCheck,
}

/** One rule: its field (with its type's icon), its condition and its value. */
export function RuleLine({
  namespace,
  fields,
  rule,
  field,
  onChange,
}: {
  namespace: string
  fields: FilterField[]
  rule: Rule
  field: FilterField
  onChange: (rule: Rule) => void
}) {
  const { t } = useTranslation([namespace, 'collection'])
  const fieldLabel = t(field.label)
  const Icon = KIND_ICON[field.kind]
  return (
    <>
      <Pick
        label={t('collection:filter.field')}
        text={fieldLabel}
        icon={<Icon size={14} className="shrink-0 text-muted" />}
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
      className="min-w-0 flex-1 justify-between"
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
      className="h-8 w-full min-w-0 rounded-[var(--field-radius)] border border-border bg-surface px-2.5 outline-none focus-visible:border-foreground"
    />
  )
}

/** A small menu button showing its choice: a field, an operator, or values. */
export function Pick({
  label,
  text,
  icon,
  options,
  selected,
  onChange,
  multiple = false,
  className = 'shrink-0',
}: {
  label: string
  text: string
  icon?: ReactNode
  options: { id: string; label: string }[]
  selected: string | string[]
  onChange: (id: string, all?: string[]) => void
  multiple?: boolean
  className?: string
}) {
  const ids = Array.isArray(selected) ? selected : [selected]
  return (
    <MenuTrigger>
      <Button
        size="sm"
        look="ghost"
        aria-label={label}
        className={cn(fieldButton, className)}
      >
        {icon}
        <span className="truncate">{text}</span>
        <ChevronDown size={14} className="shrink-0 text-muted" />
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
