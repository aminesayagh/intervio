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

test('an empty value in the panel is "Add …": pressed, its field takes the focus, and a value replaces it', async () => {
  // Item 001 has no quantity.
  const source = itemSource(makeItems(5))
  renderAt(
    `/items?open=${makeItems(1)[0].id}`,
    <Collection definition={itemDefinition(source)} />,
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 001' })
  await userEvent.click(
    await within(aside).findByRole('button', { name: 'Add Quantity' }),
  )
  const field = await within(aside).findByRole('textbox', { name: 'Quantity' })
  await waitFor(() => expect(field).toHaveFocus())

  // Left without a value: "Add Quantity" again.
  await userEvent.tab()
  expect(
    await within(aside).findByRole('button', { name: 'Add Quantity' }),
  ).toBeInTheDocument()

  await userEvent.click(
    within(aside).getByRole('button', { name: 'Add Quantity' }),
  )
  await userEvent.type(
    await within(aside).findByRole('textbox', { name: 'Quantity' }),
    '4{Enter}',
  )
  await waitFor(() => expect(source.items()[0].quantity).toBe(4))
  expect(
    within(aside).queryByRole('button', { name: 'Add Quantity' }),
  ).not.toBeInTheDocument()
})
