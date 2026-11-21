import { Button } from '@heroui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Segmented } from '../../ui-kit'
import { itemSource } from '../testing/items'

// ponytail: a developer's page, never built into production (spec 17.1), so its few
// labels are plain English rather than translations.

/** One source for the page's lifetime, so the knobs below stay set between renders. */
const source = itemSource()

type Latency = '0' | '300' | '1500'

/**
 * /dev/collection: the wrapper with 300 fake items, where each delivery step is seen
 * before any real collection uses it. The knobs make the data slow or failing.
 */
export default function CollectionShowcase() {
  const queryClient = useQueryClient()
  const [latency, setLatency] = useState<Latency>('0')
  const first = useQuery({
    queryKey: ['showcase', 'first-page'],
    queryFn: () =>
      source.list({
        search: '',
        filters: {},
        sort: { by: 'updated', direction: 'desc' },
        cursor: null,
      }),
    retry: false,
  })

  function chooseLatency(value: Latency) {
    setLatency(value)
    source.settings.latencyMs = Number(value)
  }

  return (
    <div className="flex max-w-[744px] flex-col gap-6">
      <div>
        <h1 className="text-xl font-medium">Collection showcase</h1>
        <p className="text-muted">
          Development only. The collection wrapper with 300 test items, built
          step by step (collection-archetype-spec.md, section 17).
        </p>
      </div>

      <section className="flex flex-wrap items-end gap-4">
        <Segmented
          label="Answer delay"
          value={latency}
          onChange={chooseLatency}
          options={[
            { value: '0', label: 'None' },
            { value: '300', label: '0.3 s' },
            { value: '1500', label: '1.5 s' },
          ]}
        />
        <Button
          variant="secondary"
          onPress={() => (source.settings.failNext = true)}
        >
          Fail the next request
        </Button>
        <Button
          variant="secondary"
          onPress={() =>
            queryClient.invalidateQueries({ queryKey: ['showcase'] })
          }
        >
          Reload
        </Button>
      </section>

      {/* Step 0 only checks the wiring; the wrapper replaces this from step 2. */}
      <section aria-live="polite" className="text-muted">
        {first.isPending && 'Loading…'}
        {first.isError && 'The request failed. Reload to try again.'}
        {first.data &&
          !first.isError &&
          `${first.data.total} items, first page of ${first.data.items.length}, ` +
            `${first.data.nextCursor ? 'more pages to load' : 'no more pages'}.`}
      </section>
    </div>
  )
}
