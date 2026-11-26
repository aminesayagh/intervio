import type { CollectionDefinition } from '../definition'
import type { Sort, SortDirection } from '../types'

/**
 * The list's filter rules and sort levels, apart from any screen (decision 149): what
 * a column can be filtered and sorted by, how a rule is written in the address and
 * sent to the data source, and how a record in memory is checked against it.
 */

/** What a filterable column holds, which decides its operators and its value input. */
export type FilterKind =
  'text' | 'number' | 'date' | 'choice' | 'tags' | 'check'

export type Operator = 'is' | 'not' | 'contains' | 'gt' | 'lt' | 'empty'

/** The operators each kind offers, the first one the default. */
export const OPERATORS: Record<FilterKind, Operator[]> = {
  text: ['contains', 'is'],
  number: ['is', 'gt', 'lt'],
  date: ['is', 'gt', 'lt'],
  choice: ['is', 'not'],
  tags: ['is', 'not'],
  check: ['is'],
}

/** A column (or a fixed filter) the Filter menu offers. */
export type FilterField = {
  id: string
  /** Translation key in the collection's namespace. */
  label: string
  kind: FilterKind
  /** The values to choose from (choice and tags); labels are translation keys. */
  options?: { id: string; label: string }[]
}

/** One rule: a field, an operator, and its values (one, except "is one of"). */
export type Rule = { id: string; op: Operator; values: string[] }

/** `status` for "is", `quantity.gt` for the others: the address's f.{key} and the data source's. */
export const ruleKey = (id: string, op: Operator) =>
  op === 'is' ? id : `${id}.${op}`

export function readRule(key: string, values: string[]): Rule {
  const [id, op = 'is'] = key.split('.')
  return { id, op: op as Operator, values }
}

/** Every key the fields' rules can use: each field with each of its operators. */
export const ruleKeys = (fields: FilterField[]) =>
  fields.flatMap((field) =>
    OPERATORS[field.kind].map((op) => ruleKey(field.id, op)),
  )

const CHECK_OPTIONS = [
  { id: 'true', label: 'collection:filter.yes' },
  { id: 'false', label: 'collection:filter.no' },
]

/**
 * What the Filter menu offers: the collection's fixed filters (their options), then
 * each column marked `filter`, of the kind its field says.
 */
export function filterFields<T, C>(
  definition: Pick<CollectionDefinition<T, C>, 'filters' | 'columns'>,
): FilterField[] {
  const fixed: FilterField[] = (definition.filters ?? []).map((filter) => ({
    id: filter.id,
    label: filter.label,
    kind: 'choice',
    options: filter.options,
  }))
  const taken = new Set(fixed.map((field) => field.id))
  const columns = definition.columns.flatMap((column): FilterField[] => {
    if (!column.filter || taken.has(column.id)) return []
    const field = column.field
    const base = { id: column.id, label: column.label }
    switch (field?.type) {
      case 'number':
        return [{ ...base, kind: 'number' }]
      case 'date':
        return [{ ...base, kind: 'date' }]
      case 'select':
        return [{ ...base, kind: 'choice', options: field.options }]
      case 'multiSelect':
        return [{ ...base, kind: 'tags', options: field.options }]
      case 'checkbox':
        return [{ ...base, kind: 'check', options: CHECK_OPTIONS }]
      default:
        return [{ ...base, kind: 'text' }]
    }
  })
  return [...fixed, ...columns]
}

/** A record's value for a rule: one value, several (tags, linked ids), or none. */
export type FilterValue =
  string | number | boolean | null | undefined | string[]

/** Whether a value passes a rule (memory sources; the backend does the same). */
export function matches(value: FilterValue, op: Operator, chosen: string[]) {
  if (chosen.length === 0) return true
  const values = (Array.isArray(value) ? value : [value])
    .filter((v) => v !== null && v !== undefined)
    .map(String)
  const [first] = chosen
  switch (op) {
    case 'is':
      return values.some((v) => chosen.includes(v))
    case 'not':
      return !values.some((v) => chosen.includes(v))
    case 'contains':
      return values.some((v) => v.toLowerCase().includes(first.toLowerCase()))
    // No value at all (`due.empty`: ['true']): the calendar's records without a
    // date (MAS-55). Not offered in the Filter menu.
    case 'empty':
      return values.length === 0
    case 'gt':
    case 'lt': {
      if (values.length === 0) return false
      const [v] = values
      // Numbers as numbers; dates ('2026-12-01') compare as text.
      const order =
        typeof value === 'number'
          ? Number(v) - Number(first)
          : v.localeCompare(first)
      return op === 'gt' ? order > 0 : order < 0
    }
  }
}

/** True when a record passes every rule of a list's filters. */
export function passes(
  filters: Record<string, string[]>,
  valueOf: (id: string) => FilterValue,
) {
  return Object.entries(filters).every(([key, chosen]) => {
    const rule = readRule(key, chosen)
    return matches(valueOf(rule.id), rule.op, rule.values)
  })
}

/**
 * A column header pressed (decision 149): its first direction as the only level,
 * then reversed, then the collection's default order (no level).
 */
export function nextSort(
  sort: Sort[],
  by: string,
  first: SortDirection,
): Sort[] {
  const [only] = sort
  if (sort.length !== 1 || only.by !== by) return [{ by, direction: first }]
  if (only.direction === first)
    return [{ by, direction: first === 'asc' ? 'desc' : 'asc' }]
  return []
}

/** `name:asc,updated:desc` in the address and the request; anything unreadable is left out. */
export const formatSort = (sort: Sort[]) =>
  sort.map((level) => `${level.by}:${level.direction}`).join(',')

export function parseSort(text: string): Sort[] {
  return text.split(',').flatMap((part) => {
    const [by, direction] = part.split(':')
    return by && (direction === 'asc' || direction === 'desc')
      ? [{ by, direction }]
      : []
  })
}

/** How a group's rules combine: every one must match, or at least one. */
export type Join = 'and' | 'or'

/**
 * Composed rules (decision 161): a group's rules and groups joined by one word. The
 * top group may hold groups; those hold rules only (one level).
 */
export type FilterGroup = { join: Join; rules: (Rule | FilterGroup)[] }

export const isGroup = (item: Rule | FilterGroup): item is FilterGroup =>
  'rules' in item

/** Leaves out what doesn't apply yet: rules without a value, and groups left empty. */
export function applied(group: FilterGroup): FilterGroup {
  const rules = group.rules.flatMap((item): (Rule | FilterGroup)[] => {
    if (!isGroup(item)) return item.values.length ? [item] : []
    const inner = applied(item)
    return inner.rules.length ? [inner] : []
  })
  return { join: group.join, rules }
}

/** How many rules apply, for the menu's count ("Filter (3)"). */
export const ruleCount = (group: FilterGroup): number =>
  group.rules.reduce(
    (count, item) => count + (isGroup(item) ? ruleCount(item) : 1),
    0,
  )

/** True when a record passes a group: every rule, or one of them (none: it passes). */
export function passesGroup(
  group: FilterGroup,
  valueOf: (id: string) => FilterValue,
): boolean {
  const { rules } = applied(group)
  const check = (item: Rule | FilterGroup) =>
    isGroup(item)
      ? passesGroup(item, valueOf)
      : matches(valueOf(item.id), item.op, item.values)
  if (rules.length === 0) return true
  return group.join === 'and' ? rules.every(check) : rules.some(check)
}

/** The plain rules (`f.{key}`) as a group: every one must match. */
export const groupOf = (filters: Record<string, string[]>): FilterGroup => ({
  join: 'and',
  rules: Object.entries(filters)
    .filter(([, values]) => values.length > 0)
    .map(([key, values]) => readRule(key, values)),
})

/**
 * The group as plain `f.{key}` rules when they can say it (every rule must match, no
 * group, one rule per key), so simple links keep their short form; else null.
 */
export function plainOf(group: FilterGroup) {
  const { join, rules } = applied(group)
  const plain: Record<string, string[]> = {}
  for (const item of rules) {
    if (isGroup(item)) return null
    const key = ruleKey(item.id, item.op)
    if (key in plain) return null
    plain[key] = item.values
  }
  return rules.length > 1 && join === 'or' ? null : plain
}

const OPS = new Set<string>(Object.values(OPERATORS).flat())

/** Reads `filter=` (JSON) from an address; anything unreadable is left out. */
export function parseGroup(text: string): FilterGroup | null {
  try {
    return readGroup(JSON.parse(text), 0)
  } catch {
    return null
  }
}

function readGroup(value: unknown, depth: number): FilterGroup | null {
  const v = value as Partial<FilterGroup> | null
  if (!v || (v.join !== 'and' && v.join !== 'or') || !Array.isArray(v.rules))
    return null
  const rules = v.rules.flatMap((item: unknown): (Rule | FilterGroup)[] => {
    if (item && typeof item === 'object' && 'rules' in item) {
      // One level of groups: a group inside a group is left out.
      const inner = depth === 0 ? readGroup(item, 1) : null
      return inner ? [inner] : []
    }
    const rule = item as Partial<Rule> | null
    const ok =
      typeof rule?.id === 'string' &&
      OPS.has(rule.op as string) &&
      Array.isArray(rule.values) &&
      rule.values.every((x) => typeof x === 'string')
    return ok ? [{ id: rule.id!, op: rule.op!, values: rule.values! }] : []
  })
  return { join: v.join, rules }
}

export const formatGroup = (group: FilterGroup) => JSON.stringify(group)

/** The same rules once in force, however written (order of plain rules, an unused join). */
export function sameRules(a: FilterGroup, b: FilterGroup) {
  const text = (group: FilterGroup) => {
    const plain = plainOf(group)
    return plain
      ? JSON.stringify(Object.entries(plain).sort())
      : formatGroup(applied(group))
  }
  return text(a) === text(b)
}

/** The group with a new rule at its end: the first field, its first condition, no value. */
export function withRule(
  group: FilterGroup,
  fields: FilterField[],
): FilterGroup {
  const [field] = fields
  const rule: Rule = { id: field.id, op: OPERATORS[field.kind][0], values: [] }
  return { ...group, rules: [...group.rules, rule] }
}
