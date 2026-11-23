import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { usePath } from '../../navigation'
import { Collection } from '../Collection'
import type { CollectionDefinition } from '../definition'
import { itemSource, makeItems, type Item } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { partDefinition, partSource, type Part } from '../testing/parts'
import { renderAt } from '../testing/render'
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
  const section = (await within(aside).findByText('Parts')).closest('section')!
  await userEvent.click(
    await within(section).findByRole('button', { name: /Show all/ }),
  )
}

test('a section shows its first five linked records and their count', async () => {
  show(`/items?open=${ITEM_001}`)
  const aside = await panel('Item 001')
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
