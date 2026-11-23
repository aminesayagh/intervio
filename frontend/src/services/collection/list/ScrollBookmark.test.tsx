import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { reachListEnd, stubElementSizes } from '../testing/layout'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'
import type { ListQuery } from '../types'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

/** A source that notes each page asked: its cursor and direction. */
function spiedSource() {
  const source = itemSource(makeItems(100))
  const asked: Pick<ListQuery, 'cursor' | 'direction'>[] = []
  const list = source.list
  source.list = (query, context) => {
    asked.push({ cursor: query.cursor, direction: query.direction })
    return list(query, context)
  }
  return { source, asked }
}

test('a reload starts at the page the person was on, not at the top', async () => {
  const { source, asked } = spiedSource()
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  await screen.findByDisplayValue('Item 001')
  reachListEnd() // the second page loads
  await waitFor(() => expect(asked).toHaveLength(2))
  const secondPage = asked[1]

  // The person scrolls down to Item 041, the 11th row of the second page.
  const table = screen.getByRole('grid')
  table.scrollTop = 40 * 43
  fireEvent.scroll(table)
  await waitFor(() =>
    expect(
      sessionStorage.getItem('intervio.collection.test-items.scroll'),
    ).toContain('"row":10'),
  )
  const saved = Object.fromEntries(
    Object.keys(sessionStorage).map((name) => [
      name,
      sessionStorage.getItem(name)!,
    ]),
  )

  // A reload: the tab keeps its storage.
  cleanup()
  const reloaded = spiedSource()
  renderAt(
    '/items',
    <Collection definition={itemDefinition(reloaded.source)} />,
    saved,
  )
  await screen.findByDisplayValue('Item 041')
  // One request for that page, none for the 30 records above it.
  expect(reloaded.asked[0]).toEqual(secondPage)
  expect(screen.queryByDisplayValue('Item 001')).not.toBeInTheDocument()
})

test('near the top of its page, the page before loads too, and the row stays in view', async () => {
  const { source, asked } = spiedSource()
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  await screen.findByDisplayValue('Item 001')
  reachListEnd()
  await waitFor(() => expect(asked).toHaveLength(2))

  // Item 032: the 2nd row of the second page.
  const table = screen.getByRole('grid')
  table.scrollTop = 31 * 43
  fireEvent.scroll(table)
  await waitFor(() =>
    expect(
      sessionStorage.getItem('intervio.collection.test-items.scroll'),
    ).toContain('"row":1'),
  )
  const saved = Object.fromEntries(
    Object.keys(sessionStorage).map((name) => [
      name,
      sessionStorage.getItem(name)!,
    ]),
  )

  cleanup()
  const reloaded = spiedSource()
  renderAt(
    '/items',
    <Collection definition={itemDefinition(reloaded.source)} />,
    saved,
  )
  // Its page, then the one before it: two requests, whatever the depth.
  await waitFor(() => expect(reloaded.asked).toHaveLength(2))
  expect(reloaded.asked[1].direction).toBe('before')
  // The rows added above leave Item 032 where it was: 31 rows down.
  await waitFor(() => expect(screen.getByRole('grid').scrollTop).toBe(31 * 43))
})
