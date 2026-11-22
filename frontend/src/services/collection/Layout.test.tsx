import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../i18n'
import { useSidebarFolded } from '../ui-kit'
import { Collection } from './Collection'
import { itemSource, makeItems } from './testing/items'
import { setScreenWidth, stubElementSizes } from './testing/layout'
import { renderAt } from './testing/render'
import { itemDefinition } from './testing/testDefinition'

// Every element is 1128 px wide: the room for the list and the panel.
beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(() => {
  cleanup()
  setScreenWidth(1600)
})

const WIDTH_KEY = 'intervio.collection.test-items.panelWidth'

function FoldProbe() {
  return <p>{useSidebarFolded() ? 'sidebar folded' : 'sidebar open'}</p>
}

async function openPanel(width = 1600) {
  setScreenWidth(width)
  renderAt(
    '/items',
    <>
      <Collection definition={itemDefinition(itemSource(makeItems(5)))} />
      <FoldProbe />
    </>,
  )
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 001' }),
  )
  await screen.findByRole('complementary', { name: 'Item 001' })
}

const divider = () =>
  screen.getByRole('separator', { name: 'Resize the panel' })
const headers = () =>
  within(screen.getByRole('table'))
    .getAllByRole('columnheader')
    .map((header) => header.textContent)

test('the arrow keys, Home, End and Enter change the width within the limits', async () => {
  await openPanel()
  expect(divider()).toHaveAttribute('aria-valuenow', '560')
  divider().focus()
  await userEvent.keyboard('{ArrowLeft}')
  expect(divider()).toHaveAttribute('aria-valuenow', '576')
  await userEvent.keyboard('{End}')
  expect(divider()).toHaveAttribute('aria-valuenow', '728') // the list keeps 400 px
  await userEvent.keyboard('{Home}')
  expect(divider()).toHaveAttribute('aria-valuenow', '400')
  await userEvent.keyboard('{Enter}')
  expect(divider()).toHaveAttribute('aria-valuenow', '560')
})

test('dragging changes the width, a double-click puts back 560 px', async () => {
  await openPanel()
  fireEvent.pointerDown(divider(), { clientX: 600, pointerId: 1 })
  fireEvent.pointerMove(divider(), { clientX: 500, pointerId: 1 })
  fireEvent.pointerUp(divider(), { clientX: 500, pointerId: 1 })
  expect(divider()).toHaveAttribute('aria-valuenow', '660')
  expect(localStorage.getItem(WIDTH_KEY)).toBe('660')
  fireEvent.doubleClick(divider())
  expect(divider()).toHaveAttribute('aria-valuenow', '560')
})

test('the next panel opens with the saved width; an extreme one at the limit', async () => {
  await openPanel()
  divider().focus()
  await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
  await userEvent.click(screen.getByRole('button', { name: 'Close' }))
  await userEvent.click(screen.getByRole('button', { name: 'Open Item 002' }))
  expect(divider()).toHaveAttribute('aria-valuenow', '592')

  localStorage.setItem(WIDTH_KEY, '1000')
  await userEvent.click(screen.getByRole('button', { name: 'Close' }))
  await userEvent.click(screen.getByRole('button', { name: 'Open Item 003' }))
  // At most 60% of the 1128 px.
  expect(divider()).toHaveAttribute('aria-valuenow', '677')
})

test('the table shows fewer columns as the panel grows, keeping the name', async () => {
  await openPanel()
  expect(headers()).toEqual(['Name', 'Status', 'Updated'])
  divider().focus()
  await userEvent.keyboard('{End}')
  expect(headers()).toEqual(['Name', 'Status'])
  await userEvent.click(screen.getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(headers()).toHaveLength(5))
})

test('at medium width the sidebar folds while a panel is open', async () => {
  await openPanel(1200)
  expect(screen.getByText('sidebar folded')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(await screen.findByText('sidebar open')).toBeInTheDocument()
})

test('on a narrow screen the panel is the screen, with a way back', async () => {
  await openPanel(900)
  expect(screen.queryByRole('separator')).toBeNull()
  const aside = screen.getByRole('complementary', { name: 'Item 001' })
  expect(within(aside).queryByRole('button', { name: 'Close' })).toBeNull()
  await userEvent.click(
    within(aside).getByRole('button', { name: 'Back to Items' }),
  )
  await waitFor(() =>
    expect(
      screen.queryByRole('complementary', { name: 'Item 001' }),
    ).toBeNull(),
  )
})
