import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { usePath } from '../../navigation'
import { Button, Segmented, Show } from '../../ui-kit'
import { Collection } from '..'
import {
  checkDefinition,
  checkSource,
  itemDefinition,
  itemSource,
  partDefinition,
  partSource,
} from '../testing'

// ponytail: a developer's page, never built into production (spec 17.1), so its few
// labels are plain English rather than translations.

/** One source each for the page's lifetime, so the switches below stay set. */
const full = itemSource()
const empty = itemSource([])
/** What the fake person may change, set by the Rights switch (read at each render). */
type RightsChoice = 'all' | 'status' | 'none'
let rightsChoice: RightsChoice = 'all'
const rights = () => ({
  actions: rightsChoice === 'all' ? ['archive', 'remove'] : [],
  // "+ Link or add" under the Parts section, with every right.
  add: rightsChoice === 'all' ? ['parts'] : [],
  edit:
    rightsChoice === 'all'
      ? [
          'name',
          'title',
          'status',
          'owner',
          'quantity',
          'active',
          'tags',
          'due',
          'planned',
          'notes',
          'website',
          'email',
          'phone',
          'location',
          'icon',
          'avatar',
          'files',
          'description',
        ]
      : rightsChoice === 'status'
        ? ['status']
        : [],
})
const parts = partSource()
const definitions = {
  full: {
    ...itemDefinition(
      full,
      'showcase-items',
      rights,
      () => partsDefinition,
      '/dev/collection',
      () => checksDefinition,
    ),
    // Configured views (decision 168): the tabs above the list.
    views: [
      { id: 'all', name: 'collection:views.all', type: 'table' as const },
      {
        id: 'active',
        name: 'Active',
        type: 'table' as const,
        filters: { active: ['true'] },
        sort: [{ by: 'quantity', direction: 'desc' as const }],
        // Locked (MOH-33): no Filter or Sort menu; the search stays.
        filtersEditable: false,
        sortEditable: false,
      },
      {
        id: 'short',
        name: 'Short',
        type: 'table' as const,
        columns: ['name', 'status', 'owner', 'updated'],
      },
      {
        id: 'board',
        name: 'Board',
        type: 'kanban' as const,
        groupBy: 'status',
        card: ['owner', 'quantity'],
      },
    ],
  },
  empty: itemDefinition(empty, 'showcase-empty', rights),
}
/** The second collection, linked to the items (step 12): its list is /dev/parts. */
const partsDefinition = partDefinition(parts, () => definitions.full, {
  key: 'showcase-parts',
  basePath: '/dev/parts',
})

/** The checks, which live inside an item (notice 3): /dev/collection/{item}/checks. */
const checks = checkSource()
const checksDefinition = checkDefinition(checks, {
  key: 'showcase-checks',
  itemsPath: '/dev/collection',
})

/** The answer delay the page starts with: enough to see the loading states. */
const START_DELAY: Latency = '300'
for (const source of [full, empty, parts, checks])
  source.settings.latencyMs = Number(START_DELAY)
/** An item's checks page: the item's id from the address is the list's context. */
const CHECKS_PATH = /^\/dev\/collection\/([^/]+)\/checks(?:\/|$)/

/** /dev/parts: the parts linked to the showcase's items, where "Show all" drills. */
export function PartsShowcase() {
  return <Collection definition={partsDefinition} />
}

type Latency = '0' | '300' | '1500'

/**
 * /dev/collection: the wrapper with 300 test items, where each delivery step is seen
 * before any real collection uses it. The switches make the data slow, failing or empty.
 */
export default function CollectionShowcase() {
  const checksOf = CHECKS_PATH.exec(usePath())?.[1]
  return (
    <Show when={checksOf} fallback={<ItemsShowcase />}>
      {(item) => (
        <Collection
          key={item}
          definition={checksDefinition}
          context={{ item: decodeURIComponent(item) }}
        />
      )}
    </Show>
  )
}

function ItemsShowcase() {
  const queryClient = useQueryClient()
  const [latency, setLatency] = useState<Latency>(START_DELAY)
  const [failing, setFailing] = useState(false)
  const [items, setItems] = useState<'full' | 'empty'>('full')
  const [allowed, setAllowed] = useState<RightsChoice>(rightsChoice)
  const [refusing, setRefusing] = useState(false)

  function set(change: Partial<{ latency: Latency; failing: boolean }>) {
    for (const source of [full, empty, parts, checks]) {
      if (change.latency) source.settings.latencyMs = Number(change.latency)
      if (change.failing !== undefined) source.settings.failing = change.failing
    }
    if (change.latency) setLatency(change.latency)
    if (change.failing !== undefined) setFailing(change.failing)
  }

  return (
    <>
      {/* Floating in a corner, so the page itself never scrolls: only the list does. */}
      <details className="fixed right-4 bottom-4 z-20 max-w-[calc(100vw-2rem)] rounded-[var(--field-radius)] border border-dashed border-border bg-background p-3 shadow-md">
        <summary className="cursor-pointer text-muted">
          Showcase switches (development only)
        </summary>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <Segmented
            label="Items"
            value={items}
            onChange={setItems}
            options={[
              { value: 'full', label: '300' },
              { value: 'empty', label: 'None' },
            ]}
          />
          <Segmented
            label="Answer delay"
            value={latency}
            onChange={(value) => set({ latency: value })}
            options={[
              { value: '0', label: 'None' },
              { value: '300', label: '0.3 s' },
              { value: '1500', label: '1.5 s' },
            ]}
          />
          <Segmented
            label="Requests"
            value={failing ? 'fail' : 'answer'}
            onChange={(value) => set({ failing: value === 'fail' })}
            options={[
              { value: 'answer', label: 'Answer' },
              { value: 'fail', label: 'Fail' },
            ]}
          />
          <Segmented
            label="Rights"
            value={allowed}
            onChange={(value) => {
              rightsChoice = value
              setAllowed(value)
            }}
            options={[
              { value: 'all', label: 'All' },
              { value: 'status', label: 'Status only' },
              { value: 'none', label: 'None' },
            ]}
          />
          <Segmented
            label="Changes"
            value={refusing ? 'refuse' : 'accept'}
            onChange={(value) => {
              full.settings.forbidden = value === 'refuse'
              setRefusing(value === 'refuse')
            }}
            options={[
              { value: 'accept', label: 'Accepted' },
              { value: 'refuse', label: 'Refused (403)' },
            ]}
          />
          <Button
            look="secondary"
            onPress={() =>
              queryClient.resetQueries({ queryKey: [definitions[items].key] })
            }
          >
            Reload from scratch
          </Button>
        </div>
      </details>

      <Collection
        key={items}
        definition={definitions[items]}
        basePath="/dev/collection"
      />
    </>
  )
}
