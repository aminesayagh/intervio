import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { usePath } from '../../navigation'
import { Collection } from '../Collection'
import type { CollectionDefinition } from '../definition'
import { itemSource, makeItems, type Item } from '../testing/items'
import { setScreenWidth, stubElementSizes } from '../testing/layout'
import { partDefinition, partSource, type Part } from '../testing/parts'
import { seeSections } from '../testing/panel'
import { renderAt } from '../testing/render'
import { Folds } from './Folded'
import { Show, useTopBarBack } from '../../ui-kit'
import { itemDefinition } from '../testing/testDefinition'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(() => {
  cleanup()
  setScreenWidth(1600) // one test narrows the screen
})

const ITEM_001 = '00000000-0000-7000-8000-000000000001'

/** Two collections linked to each other, each at its own address, as in the app. */
function show(url: string, beside?: ReactElement) {
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
  renderAt(
    url,
    <>
      <Pages />
      {beside}
    </>,
  )
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

test('a section shows its first five linked records, and Show all for the others', async () => {
  show(`/items?open=${ITEM_001}`)
  const aside = await panel('Item 001')
  seeSections()
  const section = (await within(aside).findByText('Parts')).closest('section')!
  expect(
    await within(section).findByRole('button', { name: /Show all/ }),
  ).toBeInTheDocument()
  expect(within(section).getAllByRole('listitem')).toHaveLength(5)
})

test('"Show all" opens the linked list, scoped to the record by a chip', async () => {
  show(`/items?open=${ITEM_001}`)
  await showAllParts()
  expect(await screen.findByText('Linked to: Item 001')).toBeInTheDocument()
  await waitFor(() =>
    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '8'),
  )
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
  await waitFor(() => expect(window.location.search).toBe(''))
  expect(screen.queryByText('Linked to: Item 001')).not.toBeInTheDocument()
})

test('a record created in a scoped list is linked to the parent', async () => {
  const { parts } = show(`/parts?f.item=${ITEM_001}`)
  await userEvent.click(await screen.findByRole('button', { name: 'New' }))
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

  // One step back, to the item, whose Parts section no longer lists it.
  const item = await panel('Item 001')
  seeSections()
  const section = (await within(item).findByText('Parts')).closest('section')!
  await waitFor(() =>
    expect(within(section).queryByText('Filter 1, Item 001')).toBeNull(),
  )
  expect(screen.queryByRole('navigation', { name: 'Records left' })).toBeNull()

  await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
  expect(
    await within(section).findByText('Filter 1, Item 001'),
  ).toBeInTheDocument()
})

test('a section that fails to load says so, with Retry', async () => {
  const { parts } = show(`/items?open=${ITEM_001}`)
  parts.settings.failing = true
  const aside = await panel('Item 001')
  seeSections()
  const section = (await within(aside).findByText('Parts')).closest('section')!
  expect(
    await within(section).findByText('Records could not be loaded.'),
  ).toBeInTheDocument()
  parts.settings.failing = false
  await userEvent.click(within(section).getByRole('button', { name: 'Retry' }))
  expect(
    await within(section).findByRole('button', { name: 'Filter 1, Item 001' }),
  ).toBeInTheDocument()
})

test('on the full page, a linked record links to its own page', async () => {
  show(`/items/${ITEM_001}`)
  await screen.findByRole('heading', { name: 'Item 001' })
  seeSections()
  const link = await screen.findByRole('link', { name: 'Filter 1, Item 001' })
  expect(link.getAttribute('href')).toMatch(/^\/parts\/[0-9a-f-]+$/)
})

test('the full page offers Retry when its record fails to load', async () => {
  const { items } = show(`/items/${ITEM_001}`)
  items.settings.failing = true
  expect(
    await screen.findByRole('button', { name: 'Retry' }, { timeout: 3000 }),
  ).toBeInTheDocument()
  items.settings.failing = false
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(
    await screen.findByRole('heading', { name: 'Item 001' }),
  ).toBeInTheDocument()
})

/** Draws the ‹ the top bar would show (the board layout reads the same store). */
function BackProbe() {
  const back = useTopBarBack()
  return (
    <Show when={back}>
      {(up) => (
        <button type="button" onClick={up.run}>
          {up.label}
        </button>
      )}
    </Show>
  )
}

test('on a narrow screen, the top bar’s ‹ goes up to the view left', async () => {
  setScreenWidth(900)
  show(`/items?open=${ITEM_001}`, <BackProbe />)
  await showAllParts()
  await screen.findByText('Linked to: Item 001')
  await userEvent.click(
    await screen.findByRole('button', { name: 'Back to Items · Item 001' }),
  )
  expect(await panel('Item 001')).toBeInTheDocument()
  expect(window.location.pathname).toBe('/items')
})

test('a linked record people work inside opens its page; Back returns to the panel', async () => {
  show(`/items?open=${ITEM_001}`)
  await openLinked('Item 001', 'Parts', 'Bearing 3, Item 001')
  // Its own page (screen 51), not the panel.
  expect(
    await screen.findByRole('heading', { name: 'Bearing 3, Item 001' }),
  ).toBeInTheDocument()
  expect(window.location.pathname).toMatch(/^\/parts\/[0-9a-f-]+$/)
  act(() => window.history.back())
  expect(await panel('Item 001')).toBeInTheDocument()
})

test('a section passes its context to its collection', async () => {
  const items = itemSource(makeItems(8))
  const parts = partSource()
  const asked: unknown[] = []
  const list = parts.list
  parts.list = (query, context) => {
    asked.push(context)
    return list(query, context)
  }
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
  definitions.parts = partDefinition(parts, () => definitions.items!)
  const panelDefinition = definitions.items.panel!
  panelDefinition.sections = panelDefinition.sections!.map((section) =>
    section.id === 'parts'
      ? { ...section, context: () => ({ site: 'Building B' }) }
      : section,
  )
  renderAt(
    `/items?open=${ITEM_001}`,
    <Collection definition={definitions.items} />,
  )
  await openLinked('Item 001', 'Parts', 'Filter 1, Item 001')
  expect(asked).toContainEqual({ site: 'Building B' })
})

/** Opens "+ Link or add" under Item 001's Parts section; returns the section. */
async function linkOrAdd() {
  const aside = await panel('Item 001')
  seeSections()
  const section = (await within(aside).findByText('Parts')).closest('section')!
  await within(section).findByText('Filter 1, Item 001')
  await userEvent.click(
    within(section).getByRole('button', { name: '+ Link or add' }),
  )
  return section
}

test('"+ Link or add" links an existing record found by its name', async () => {
  const { parts } = show(`/items?open=${ITEM_001}`)
  await linkOrAdd()
  const dialog = await screen.findByRole('dialog', { name: '+ Link or add' })
  await userEvent.type(
    within(dialog).getByRole('textbox', { name: 'Search' }),
    'Filter 1, Item 004',
  )
  await userEvent.click(
    await within(dialog).findByRole('button', { name: 'Filter 1, Item 004' }),
  )
  await waitFor(() =>
    expect(
      parts.items().find((part) => part.name === 'Filter 1, Item 004')?.item,
    ).toBe(ITEM_001),
  )
})

test('"+ Link or add" adds a new record, created linked', async () => {
  const { parts } = show(`/items?open=${ITEM_001}`)
  await linkOrAdd()
  const dialog = await screen.findByRole('dialog', { name: '+ Link or add' })
  await userEvent.click(
    within(dialog).getByRole('button', { name: '+ Add part' }),
  )
  const aside = await panel('+ Add part')
  expect(window.location.pathname).toBe('/parts')
  await userEvent.type(
    within(aside).getByRole('textbox', { name: 'Title' }),
    'Gasket{Enter}',
  )
  await waitFor(() => expect(parts.items()[0].name).toBe('Gasket'))
  expect(parts.items()[0].item).toBe(ITEM_001)
})

test('without the right to add in a section, there is no "+ Link or add"', async () => {
  const definitions: {
    items?: CollectionDefinition<Item>
    parts?: CollectionDefinition<Part>
  } = {}
  definitions.items = itemDefinition(
    itemSource(makeItems(8)),
    'test-items',
    () => ({ edit: [], actions: [] }), // no `add`
    () => definitions.parts!,
    '/items',
  )
  definitions.parts = partDefinition(partSource(), () => definitions.items!)
  renderAt(
    `/items?open=${ITEM_001}`,
    <Collection definition={definitions.items} />,
  )
  const aside = await panel('Item 001')
  seeSections()
  const section = (await within(aside).findByText('Parts')).closest('section')!
  await within(section).findByText('Filter 1, Item 001')
  expect(
    within(section).queryByRole('button', { name: '+ Link or add' }),
  ).toBeNull()
})
