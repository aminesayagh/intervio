import { Button } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Segmented } from '../../ui-kit'
import { useCollectionQuery } from '../collectionQuery'
import { itemSource } from '../testing/items'

// ponytail: a developer's page, never built into production (spec 17.1), so its few
// labels are plain English rather than translations.

/** One source for the page's lifetime, so the knobs below stay set between renders. */
const source = itemSource()

type Latency = '0' | '300' | '1500'

const LISTING = {
  search: '',
  filters: {},
  sort: { by: 'updated', direction: 'desc' as const },
}

/**
 * /dev/collection: the wrapper with 300 fake items, where each delivery step is seen
 * before any real collection uses it. The knobs make the data slow or failing.
 */
export default function CollectionShowcase() {
  const queryClient = useQueryClient()
  const [latency, setLatency] = useState<Latency>('0')
  const [failing, setFailing] = useState(false)
  const list = useCollectionQuery({
    key: 'showcase',
    source,
    context: undefined,
    listing: LISTING,
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
        <Segmented
          label="Requests"
          value={failing ? 'fail' : 'answer'}
          onChange={(value) => {
            setFailing(value === 'fail')
            source.settings.failing = value === 'fail'
          }}
          options={[
            { value: 'answer', label: 'Answer' },
            { value: 'fail', label: 'Fail' },
          ]}
        />
        <Button
          variant="secondary"
          onPress={() =>
            queryClient.invalidateQueries({ queryKey: ['showcase'] })
          }
        >
          Reload
        </Button>
      </section>

      {/* Steps 0 and 1 check the data layer; the wrapper replaces this from step 2. */}
      <section aria-live="polite" className="flex flex-col items-start gap-2">
        {list.isPending && <p className="text-muted">Loading…</p>}
        {list.isError && !list.data && (
          <p className="text-muted">The request failed. Reload to try again.</p>
        )}
        {list.data && (
          <>
            <p>
              {list.items.length} of {list.total} items loaded
              {list.isFetchingNextPage && ', loading the next page…'}
              {list.isFetchNextPageError &&
                ', the next page failed: set Requests to Answer, then Load more.'}
            </p>
            <ol className="text-muted">
              {list.items.slice(-3).map((item) => (
                <li key={item.id}>
                  {item.name}, {item.status}, {item.owner}
                </li>
              ))}
            </ol>
            <Button
              variant="secondary"
              isDisabled={!list.hasNextPage || list.isFetchingNextPage}
              onPress={() => list.fetchNextPage()}
            >
              Load more
            </Button>
          </>
        )}
      </section>
    </div>
  )
}
