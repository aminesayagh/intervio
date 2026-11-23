import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { usePath } from '../../navigation'
import { Collection } from '../Collection'
import type { CollectionDefinition } from '../definition'
import { itemSource, makeItems, type Item } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { partDefinition, partSource, type Part } from '../testing/parts'
import { seeSections } from '../testing/panel'
import { renderAt } from '../testing/render'
import { Folds } from './Folded'
import { itemDefinition } from '../testing/testDefinition'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

const ITEM_001 = '00000000-0000-7000-8000-000000000001'

/** Two collections linked to each other, each at its own address, as in the app. */
function show(url: string) {
  const items = itemSource(makeItems(8))
  const parts = partSource()
  const definitions: {
    items?: CollectionDefinition<Item>
    parts?: CollectionDefinition<Part>
  } = {}
  definitions.items = itemDefinition(
    items,
    'test-items',
    undefined,
    () => definitions.parts!,
    '/items',
  )
  definitions.parts = partDefinition(parts, () => definitions.items!, {
    basePath: '/parts',
  })
  function Pages() {
    const path = usePath()
    return path.startsWith('/parts') ? (
      <Collection key="parts" definition={definitions.parts!} />
    ) : (
      <Collection key="items" definition={definitions.items!} />
    )
  }
  renderAt(url, <Pages />)
  return { items, parts }
}

const panel = (name: string) => screen.findByRole('complementary', { name })
async function showAllParts() {
  const aside = await panel('Item 001')
  seeSections()
  const section = (await within(aside).findByText('Parts')).closest('section')!
  await userEvent.click(
    await within(section).findByRole('button', { name: /Show all/ }),
  )
}

test('a section shows its first five linked records and their count', async () => {
  show(`/items?open=${ITEM_001}`)
  const aside = await panel('Item 001')
  seeSections()
  const section = (await within(aside).findByText('Parts')).closest('section')!
  expect(await within(section).findByText('7')).toBeInTheDocument()
  expect(within(section).getAllByRole('listitem')).toHaveLength(5)
})

test('"Show all" opens the linked list, scoped to the record by a chip', async () => {
  show(`/items?open=${ITEM_001}`)
  await showAllParts()
  expect(await screen.findByText('Linked to: Item 001')).toBeInTheDocument()
  expect(await screen.findByText(/^7 of \d+ parts$/)).toBeInTheDocument()
  expect(window.location.pathname).toBe('/parts')
})

test('removing the chip shows the whole collection; Clear filters keeps it', async () => {
  show(`/parts?f.item=${ITEM_001}&f.kind=seal`)
  await screen.findByText('Linked to: Item 001')
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  await waitFor(() =>
    expect(window.location.search).toBe(`?f.item=${ITEM_001}`),
  )
  expect(screen.getByText('Linked to: Item 001')).toBeInTheDocument()

  await userEvent.click(
    screen.getByRole('button', { name: 'Remove “Linked to: Item 001”' }),
  )
  expect(await screen.findByText(/^\d+ parts$/)).toBeInTheDocument()
  expect(screen.queryByText('Linked to: Item 001')).not.toBeInTheDocument()
})

test('a record created in a scoped list is linked to the parent', async () => {
  const { parts } = show(`/parts?f.item=${ITEM_001}`)
  await userEvent.click(
    await screen.findByRole('button', { name: '+ Add part' }),
  )
  const aside = await panel('+ Add part')
  await userEvent.type(
    within(aside).getByRole('textbox', { name: 'Title' }),
    'Gasket{Enter}',
  )
  await waitFor(() => expect(parts.items()[0].name).toBe('Gasket'))
  expect(parts.items()[0].item).toBe(ITEM_001)
})

const strips = () =>
  within(screen.getByRole('navigation', { name: 'Views left' }))

test('a strip returns to the view left, with its panel open', async () => {
  show(`/items?open=${ITEM_001}`)
  await showAllParts()
  await screen.findByText('Linked to: Item 001')
  await userEvent.click(
    strips().getByRole('button', { name: 'Back to Items · Item 001' }),
  )
  expect(await panel('Item 001')).toBeInTheDocument()
  expect(window.location.pathname).toBe('/items')
  expect(
    screen.queryByRole('navigation', { name: 'Views left' }),
  ).not.toBeInTheDocument()
})

test('the browser’s Back returns to the view left too', async () => {
  show(`/items?open=${ITEM_001}`)
  await showAllParts()
  await screen.findByText('Linked to: Item 001')
  act(() => window.history.back())
  expect(await panel('Item 001')).toBeInTheDocument()
  expect(window.location.pathname).toBe('/items')
})

test('removing the chip keeps the strips', async () => {
  show(`/items?open=${ITEM_001}`)
  await showAllParts()
  await userEvent.click(
    await screen.findByRole('button', {
      name: 'Remove “Linked to: Item 001”',
    }),
  )
  await waitFor(() => expect(window.location.search).toBe(''))
  expect(
    strips().getByRole('button', { name: 'Back to Items · Item 001' }),
  ).toBeInTheDocument()
})

test('beyond two, the older views fold into the first strip’s menu, newest first', async () => {
  const opened: string[] = []
  render(
    <Folds
      kind="views"
      folds={['A', 'B', 'C'].map((name) => ({
        name,
        open: () => opened.push(name),
      }))}
    />,
  )
  expect(screen.getByRole('button', { name: 'Back to C' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Back to B' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: '2 earlier views' }))
  const items = await screen.findAllByRole('menuitem')
  expect(items.map((item) => item.textContent)).toEqual(['B', 'A'])
  await userEvent.click(items[1])
  expect(opened).toEqual(['A'])
})

const tabs = () =>
  within(screen.getByRole('navigation', { name: 'Records left' }))
/** Clicks a linked record in a section of the panel shown. */
async function openLinked(panelName: string, section: string, name: string) {
  const aside = await panel(panelName)
  seeSections()
  const found = (await within(aside).findByText(section)).closest('section')!
  await userEvent.click(await within(found).findByRole('button', { name }))
}

test('a linked record opens in the panel, the record left folds into a tab, and × goes back one step', async () => {
  show(`/items?open=${ITEM_001}`)
  await openLinked('Item 001', 'Parts', 'Filter 1, Item 001')
  const part = await panel('Filter 1, Item 001')
  // Another kind: the part's own panel.
  expect(await within(part).findByText('Kind')).toBeInTheDocument()
  expect(
    tabs().getByRole('button', { name: 'Back to Item 001' }),
  ).toBeInTheDocument()

  await userEvent.click(within(part).getByRole('button', { name: 'Close' }))
  expect(await panel('Item 001')).toBeInTheDocument()
  expect(screen.queryByRole('navigation', { name: 'Records left' })).toBeNull()

  await userEvent.click(
    within(await panel('Item 001')).getByRole('button', { name: 'Close' }),
  )
  await waitFor(() =>
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument(),
  )
})

test('a tab opens its record again, and the tabs after it go', async () => {
  show(`/items?open=${ITEM_001}`)
  await openLinked('Item 001', 'Linked items', 'Item 004')
  await openLinked('Item 004', 'Parts', 'Filter 1, Item 004')
  await panel('Filter 1, Item 004')
  expect(
    tabs()
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label')),
  ).toEqual(['Back to Item 001', 'Back to Item 004'])

  await userEvent.click(
    tabs().getByRole('button', { name: 'Back to Item 001' }),
  )
  const item = await panel('Item 001')
  expect(screen.queryByRole('navigation', { name: 'Records left' })).toBeNull()

  // The tab went back through the history: × closes, with no stale entry left.
  await userEvent.click(within(item).getByRole('button', { name: 'Close' }))
  await waitFor(() =>
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument(),
  )
  expect(window.location.search).toBe('')
})

test('the browser’s Back goes back one linked record', async () => {
  show(`/items?open=${ITEM_001}`)
  await openLinked('Item 001', 'Linked items', 'Item 004')
  await panel('Item 004')
  act(() => window.history.back())
  expect(await panel('Item 001')).toBeInTheDocument()
})

test('a linked part is archived from the item’s panel: the panel goes back, the section loses it, and Undo brings it back', async () => {
  show(`/items?open=${ITEM_001}`)
  await openLinked('Item 001', 'Parts', 'Filter 1, Item 001')
  const part = await panel('Filter 1, Item 001')
  await userEvent.click(
    within(part).getByRole('button', { name: 'More actions' }),
  )
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Archive' }),
  )
  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByText('Archive this part?')).toBeInTheDocument()
  await userEvent.click(within(dialog).getByRole('button', { name: 'Archive' }))

  // One step back, to the item, whose Parts section counts one part less.
  const item = await panel('Item 001')
  seeSections()
  const section = (await within(item).findByText('Parts')).closest('section')!
  expect(await within(section).findByText('6')).toBeInTheDocument()
  expect(screen.queryByRole('navigation', { name: 'Records left' })).toBeNull()

  await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
  expect(await within(section).findByText('7')).toBeInTheDocument()
})
