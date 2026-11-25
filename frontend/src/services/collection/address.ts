import {
  createLoader,
  createParser,
  createSerializer,
  parseAsArrayOf,
  parseAsString,
} from '../navigation'
import { formatChain, parseChain, type Step } from './record/linked'
import {
  formatGroup,
  formatSort,
  parseGroup,
  parseSort,
  type FilterGroup,
} from './listing/rules'
import type { Sort } from './types'

/**
 * What a collection keeps in the address (spec 6.1), as nuqs parsers: the list
 * (q, sort, f.{filter}, filter) and the panel (open, new, linked).
 */

/** `sort=status:asc,updated:desc`: the sort levels chosen; none is the default order. */
export const sortParser = createParser<Sort[]>({
  parse: (value) => {
    const sort = parseSort(value)
    return sort.length ? sort : null
  },
  serialize: formatSort,
  eq: (a, b) => formatSort(a) === formatSort(b),
}).withDefault([])

/** `filter={"join":"or",…}`: composed rules the plain `f.{key}` can't say (decision 161). */
export const groupParser = createParser<FilterGroup>({
  parse: parseGroup,
  serialize: formatGroup,
  eq: (a, b) => formatGroup(a) === formatGroup(b),
})

/** `linked=parts:id,items:id`: the linked records opened after the panel's (decision 137). */
export const chainParser = createParser<Step[]>({
  parse: (value) => {
    const chain = parseChain(value)
    return chain.length ? chain : null
  },
  serialize: formatChain,
  eq: (a, b) => formatChain(a) === formatChain(b),
}).withDefault([])

/** The list's parameters, for a collection with these rule keys (and scope ids). */
export const listParsers = (filterIds: string[]) => ({
  q: parseAsString.withDefault(''),
  sort: sortParser,
  filter: groupParser,
  ...Object.fromEntries(
    filterIds.map((id) => [
      `f.${id}`,
      parseAsArrayOf(parseAsString).withDefault([]),
    ]),
  ),
})

/** The panel's parameters: the record open, a new one, the linked ones after it. */
export const panelParsers = {
  open: parseAsString,
  new: parseAsString,
  linked: chainParser,
}

/** Reads the panel's parameters from an address, at once (no render in between). */
export const readPanel = createLoader(panelParsers)

/** Builds an address with other panel parameters, keeping the rest. */
export const panelAddress = createSerializer(panelParsers)

/** A list's address, scoped by these filters (a section's "Show all", spec 12.1). */
export function listAddress(path: string, filters: Record<string, string[]>) {
  return createSerializer(listParsers(Object.keys(filters)))(
    path,
    Object.fromEntries(
      Object.entries(filters).map(([id, values]) => [`f.${id}`, values]),
    ),
  )
}
