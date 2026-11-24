import type { CollectionDefinition } from '../definition'
import type { Sort, SortDirection } from '../types'

/**
 * The list's filter rules and sort levels, apart from any screen (decision 149): what
 * a column can be filtered and sorted by, how a rule is written in the address and
 * sent to the data source, and how a record in memory is checked against it.
 */

/** What a filterable column holds, which decides its operators and its value input. */
export type FilterKind = 'text' | 'number' | 'date' | 'choice' | 'tags' | 'check'

export type Operator = 'is' | 'not' | 'contains' | 'gt' | 'lt'

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
export type FilterValue = string | number | boolean | null | undefined | string[]

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
