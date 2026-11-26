import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../../i18n'
import { Collection } from '../../Collection'
import { itemSource, makeItems } from '../../testing/items'
import { stubElementSizes } from '../../testing/layout'
import { renderAt } from '../../testing/render'
import { itemDefinition } from '../../testing/testDefinition'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

test('scrolled sideways, the table is marked, so the pinned name column shows its line', async () => {
  renderAt(
    '/items',
    <Collection definition={itemDefinition(itemSource(makeItems(3)))} />,
  )
  await screen.findByDisplayValue('Item 001')
  const table = screen.getByRole('grid')
  expect(screen.getAllByRole('rowheader').length).toBeGreaterThan(0)
  expect(table).not.toHaveAttribute('data-scrolled-x')
  table.scrollLeft = 120
  fireEvent.scroll(table)
  expect(table).toHaveAttribute('data-scrolled-x')
  table.scrollLeft = 0
  fireEvent.scroll(table)
  expect(table).not.toHaveAttribute('data-scrolled-x')
})
