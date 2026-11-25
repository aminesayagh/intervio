import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, PopoverDialog, Show, TextInput } from '../../ui-kit'
import { panelAddress } from '../address'
import { useCollectionQuery } from '../data/collectionQuery'
import { useRecordActions } from '../data/recordActions'
import type { AnyCollection } from '../definition'
import { drill } from '../drill/viewStack'

/**
 * "+ Link or add" under a section (spec 7, decided 2026-11-23): a small panel with a
 * search over the linked collection's records not linked yet (picking one links it,
 * saving `patch` on it), and "+ Add …", which opens the section's list ("Show all")
 * with a new record started, created linked by the list's scope.
 */
export function LinkOrAdd({
  linked,
  context,
  patch,
  listAddress,
  viewName,
}: {
  linked: AnyCollection
  context: unknown
  /** The change that links a record to this one. */
  patch: Record<string, unknown>
  /** The section's list, scoped to this record ("Show all"). */
  listAddress: string
  /** The strip's name for the view left (spec 12.1). */
  viewName: string
}) {
  const { t } = useTranslation([linked.i18n.namespace, 'collection'])
  const label = t('collection:section.linkOrAdd')
  return (
    <PopoverDialog
      label={label}
      trigger={
        <Button size="sm" look="ghost" className="-ms-3 self-start">
          {label}
        </Button>
      }
    >
      {(close) => (
        <LinkSearch
          linked={linked}
          context={context}
          patch={patch}
          onLinked={close}
          onAdd={() => {
            close()
            drill(panelAddress(listAddress, { new: '1' }), viewName)
          }}
        />
      )}
    </PopoverDialog>
  )
}

/** The panel's content, built when it opens: the search, its results, "+ Add …". */
function LinkSearch({
  linked,
  context,
  patch,
  onLinked,
  onAdd,
}: {
  linked: AnyCollection
  context: unknown
  patch: Record<string, unknown>
  onLinked: () => void
  onAdd: () => void
}) {
  const { t } = useTranslation([linked.i18n.namespace, 'collection'])
  const [search, setSearch] = useState('')
  const actions = useRecordActions(linked, context)
  const list = useCollectionQuery({
    key: linked.key,
    source: linked.source,
    context,
    listing: { search: search.trim(), filters: {}, sort: [linked.defaultSort] },
  })
  // Already linked: the linking change would change nothing on it.
  const linkedAlready = (record: unknown) =>
    Object.entries(patch).every(
      ([name, value]) => (record as Record<string, unknown>)[name] === value,
    )
  const results = list.items.filter((record) => !linkedAlready(record))
  const name = (record: unknown) =>
    linked.panel?.title(record) ?? linked.getId(record)

  // One tight column: the search, its results and "+ Add …" belong together.
  return (
    <div className="flex flex-col gap-1">
      <TextInput
        aria-label={t('collection:search')}
        placeholder={t('collection:search')}
        look="panel"
        autoFocus
        value={search}
        onChange={setSearch}
      />
      <Show
        when={results.length > 0}
        fallback={
          <p className="text-muted">
            {t(
              list.isPending
                ? 'collection:loading'
                : 'collection:section.nothingToLink',
            )}
          </p>
        }
      >
        <ul
          className="flex max-h-72 flex-col overflow-y-auto"
          // Near its end, the next page loads: scrolling goes on through every record.
          onScroll={(event) => {
            const ul = event.currentTarget
            if (
              ul.scrollHeight - ul.scrollTop - ul.clientHeight < 40 &&
              list.hasNextPage &&
              !list.isFetchingNextPage
            )
              void list.fetchNextPage()
          }}
        >
          {results.map((record) => (
            <li key={linked.getId(record)}>
              <button
                type="button"
                onClick={
                  () =>
                    void actions
                      .save(record, patch, {
                        label: t('collection:section.link'),
                      })
                      .then(onLinked, () => {}) // a failure says so (its message)
                }
                className="w-full cursor-pointer truncate rounded-[var(--field-radius)] px-2 py-1.5 text-start outline-none hover:bg-default focus-visible:bg-default"
              >
                {name(record)}
              </button>
            </li>
          ))}
        </ul>
      </Show>
      <Show when={linked.create && linked.source.create} className="flex">
        {/* As wide as the results, its pointer background inside the box. */}
        <Button
          size="sm"
          look="ghost"
          className="w-full justify-start px-2 font-normal"
          onPress={onAdd}
        >
          {t(linked.create?.add ?? '')}
        </Button>
      </Show>
    </div>
  )
}
