import { Button } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Segmented } from '../../ui-kit'
import { Collection } from '../Collection'
import { itemSource } from '../testing/items'
import { itemDefinition } from '../testing/testDefinition'

// ponytail: a developer's page, never built into production (spec 17.1), so its few
// labels are plain English rather than translations.

/** One source each for the page's lifetime, so the switches below stay set. */
const full = itemSource()
const empty = itemSource([])
const definitions = {
  full: itemDefinition(full, 'showcase-items'),
  empty: itemDefinition(empty, 'showcase-empty'),
}

type Latency = '0' | '300' | '1500'

/**
 * /dev/collection: the wrapper with 300 test items, where each delivery step is seen
 * before any real collection uses it. The switches make the data slow, failing or empty.
 */
export default function CollectionShowcase() {
  const queryClient = useQueryClient()
  const [latency, setLatency] = useState<Latency>('0')
  const [failing, setFailing] = useState(false)
  const [items, setItems] = useState<'full' | 'empty'>('full')

  function set(change: Partial<{ latency: Latency; failing: boolean }>) {
    for (const source of [full, empty]) {
      if (change.latency) source.settings.latencyMs = Number(change.latency)
      if (change.failing !== undefined) source.settings.failing = change.failing
    }
    if (change.latency) setLatency(change.latency)
    if (change.failing !== undefined) setFailing(change.failing)
  }

  return (
    <div className="flex flex-col gap-6">
      <details className="rounded-[var(--field-radius)] border border-dashed border-border p-3">
        <summary className="cursor-pointer text-muted">
          Collection showcase (development only): switches
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
          <Button
            variant="secondary"
            onPress={() =>
              queryClient.resetQueries({ queryKey: [definitions[items].key] })
            }
          >
            Reload from scratch
          </Button>
        </div>
      </details>

      <Collection key={items} definition={definitions[items]} />
    </div>
  )
}
