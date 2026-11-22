import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'
import { firstLine } from './markdown'

// A wide list, so the Notes column fits in the table.
beforeAll(() => stubElementSizes({ width: 4000, height: 400, itemHeight: 152 }))
afterEach(cleanup)

function show(rights?: Parameters<typeof itemDefinition>[2]) {
  const source = itemSource(makeItems(5))
  renderAt(
    '/items',
    <Collection definition={itemDefinition(source, 'test-items', rights)} />,
  )
  return source
}

test('the table shows the first line, and clicking it opens the record', async () => {
  show()
  const table = await screen.findByRole('grid')
  const first = within(
    table.querySelectorAll('[role="row"][data-key]')[1] as HTMLElement,
  )
  // "## Inspection" without its heading mark.
  await userEvent.click(first.getByText('Inspection'))
  expect(
    await screen.findByRole('complementary', { name: 'Item 002' }),
  ).toBeInTheDocument()
})

test('the panel edits it like the description, and it saves by itself', async () => {
  const source = show()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 003' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 003' })
  await userEvent.click(
    within(aside).getByRole('button', { name: 'Edit Notes' }),
  )
  const field = await within(aside).findByRole('textbox', { name: 'Notes' })
  await userEvent.clear(field)
  await userEvent.type(field, 'Bearings **greased**')
  await waitFor(
    () => expect(source.items()[2].notes).toBe('Bearings **greased**'),
    {
      timeout: 3000,
    },
  )
})

test('without the right, it shows formatted and cannot be edited', async () => {
  show(() => ({ edit: [] }))
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 001' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 001' })
  expect(
    within(aside).getByText('replaced', { selector: 'strong' }),
  ).toBeInTheDocument()
  expect(within(aside).queryByRole('button', { name: 'Edit Notes' })).toBeNull()
})

test('closing with notes not saved yet asks first', async () => {
  show()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 002' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 002' })
  sessionStorage.setItem(
    `intervio.collection.test-items.${makeItems(2)[1].id}.notes`,
    'draft',
  )
  await userEvent.click(within(aside).getByRole('button', { name: 'Close' }))
  expect(
    await screen.findByRole('alertdialog', { name: 'Leave without saving?' }),
  ).toBeInTheDocument()
})

test('the first line drops the Markdown marks', () => {
  expect(firstLine('## Inspection\n\nmore')).toBe('Inspection')
  expect(firstLine('\n- [x] **Seals** [checked](https://x.io) `now`')).toBe(
    'Seals checked now',
  )
  expect(firstLine('> quoted _text_')).toBe('quoted text')
  expect(firstLine('')).toBe('')
})
