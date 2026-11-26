import type { CollectionDefinition, ViewDefinition } from '../definition'
import { filterFields, ruleKeys } from '../listing/rules'

/** The view of a collection configured without any (decision 168): a table of every record. */
export const DEFAULT_VIEW: ViewDefinition = {
  id: 'all',
  name: 'collection:views.all',
  type: 'table',
}

/** A collection's views in their order (`order`, else their place); the first is the default. */
export function viewsOf(definition: { views?: ViewDefinition[] }) {
  const views = definition.views?.length ? definition.views : [DEFAULT_VIEW]
  return views
    .map((view, index) => ({ view, at: view.order ?? index }))
    .sort((a, b) => a.at - b.at)
    .map(({ view }) => view)
}

/** The columns a table view shows, in its order: every column when it names none. */
export function columnsOf<T, C>(
  definition: CollectionDefinition<T, C>,
  view: ViewDefinition,
) {
  if (view.type !== 'table' || !view.columns) return definition.columns
  const byId = new Map(definition.columns.map((column) => [column.id, column]))
  return view.columns.flatMap((id) => byId.get(id) ?? [])
}

/**
 * What is wrong in a collection's views: ids used twice, and columns, filters or sort
 * levels the collection doesn't have. Each collection's test expects none, so a
 * misspelled id fails there, not on screen.
 */
export function viewProblems<T, C>(definition: CollectionDefinition<T, C>) {
  const problems: string[] = []
  const columns = new Set(definition.columns.map((column) => column.id))
  const sortable = new Set(
    definition.columns
      .filter((column) => column.sort)
      .map((column) => column.id),
  )
  const filters = new Set([
    ...ruleKeys(filterFields(definition)),
    ...(definition.scopes ?? []).map((scope) => scope.id),
  ])
  const seen = new Set<string>()
  for (const view of definition.views ?? []) {
    const at = `view "${view.id}"`
    if (seen.has(view.id)) problems.push(`${at}: id used twice`)
    seen.add(view.id)
    const shown = view.type === 'table' ? view.columns : view.card
    for (const id of shown ?? [])
      if (!columns.has(id)) problems.push(`${at}: no column "${id}"`)
    if (view.type === 'kanban') {
      const group = definition.columns.find((c) => c.id === view.groupBy)
      const filterable =
        group?.filter ||
        definition.filters?.some((filter) => filter.id === view.groupBy)
      if (group?.field?.type !== 'select' || !filterable)
        problems.push(`${at}: "${view.groupBy}" is not a filterable select`)
    }
    for (const key of Object.keys(view.filters ?? {}))
      if (!filters.has(key)) problems.push(`${at}: no filter "${key}"`)
    for (const level of view.sort ?? [])
      if (!sortable.has(level.by))
        problems.push(`${at}: can't sort by "${level.by}"`)
  }
  return problems
}

/**
 * The values a new record takes from the filters on screen (MOH-34), so it stays in
 * the list it was created in: each "is" rule with one value (or tags) on a column
 * whose field can hold it. Fixed filters and scopes use their own `patch` (spec 7.5).
 */
export function valuesOf<T, C>(
  definition: CollectionDefinition<T, C>,
  filters: Record<string, string[]>,
): Partial<T> {
  const values: Partial<T> = {}
  for (const own of [
    ...(definition.filters ?? []),
    ...(definition.scopes ?? []),
  ]) {
    const chosen = filters[own.id] ?? []
    if (chosen.length === 1 && own.patch)
      Object.assign(values, own.patch(chosen[0]))
  }
  for (const column of definition.columns) {
    const chosen = filters[column.id] ?? []
    const field = column.field
    if (!column.filter || !field || chosen.length === 0) continue
    if (field.type === 'multiSelect') Object.assign(values, field.patch(chosen))
    if (chosen.length !== 1) continue
    const [value] = chosen
    switch (field.type) {
      case 'select':
      case 'text':
      case 'date':
        Object.assign(values, field.patch(value))
        break
      case 'checkbox':
        Object.assign(values, field.patch(value === 'true'))
        break
      case 'number':
        Object.assign(values, field.patch(Number(value)))
        break
    }
  }
  return values
}
