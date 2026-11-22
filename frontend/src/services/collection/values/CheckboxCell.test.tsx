import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

function show(rights?: Parameters<typeof itemDefinition>[2]) {
  const source = itemSource(makeItems(5))
  renderAt(
    '/items',
    <Collection definition={itemDefinition(source, 'test-items', rights)} />,
  )
  return source
}
const row = async (n: number) =>
  within(
    (await screen.findByRole('grid')).querySelectorAll(
      '[role="row"][data-key]',
    )[n - 1] as HTMLElement,
  )

test('a checkbox in the table saves on click', async () => {
  const source = show()
  // Item 001 is active (makeItems): uncheck it.
  const box = (await row(1)).getByRole('checkbox', { name: 'Active' })
  expect(box).toBeChecked()
  await userEvent.click(box)
  await waitFor(() => expect(source.items()[0].active).toBe(false))
  expect(box).not.toBeChecked()
})

test('a refused click goes back, with a message', async () => {
  const source = show()
  const box = (await row(1)).getByRole('checkbox', { name: 'Active' })
  source.settings.failing = true
  await userEvent.click(box)
  expect(
    await screen.findByText("“Active” couldn't be saved for Item 001."),
  ).toBeInTheDocument()
  expect(box).toBeChecked()
  expect(source.items()[0].active).toBe(true)
})

test('the panel saves its checkbox too', async () => {
  const source = show()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 003' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 003' })
  // Item 003 is not active.
  const box = within(aside).getByRole('checkbox', { name: 'Active' })
  expect(box).not.toBeChecked()
  await userEvent.click(box)
  await waitFor(() => expect(source.items()[2].active).toBe(true))
})

test('without the right, the checkbox is shown but read only', async () => {
  const source = show(() => ({ edit: [] }))
  const box = (await row(1)).getByRole('checkbox', { name: 'Active' })
  expect(box).toHaveAttribute('aria-readonly', 'true')
  await userEvent.click(box)
  expect(box).toBeChecked()
  expect(source.items()[0].active).toBe(true)
})
