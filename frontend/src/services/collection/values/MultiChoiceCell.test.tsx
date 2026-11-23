import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { reachValue } from '../testing/panel'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'
import { ChipList } from './ChipList'

// A wide list, so the Tags column fits in the table.
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
const row = async (n: number) =>
  within(
    (await screen.findByRole('grid')).querySelectorAll(
      '[role="row"][data-key]',
    )[n - 1] as HTMLElement,
  )
const check = async (name: string) =>
  userEvent.click(await screen.findByRole('menuitemcheckbox', { name }))

test('tags are checked while the menu is open, and saved once when it closes', async () => {
  const source = show()
  const update = vi.spyOn(source, 'update')
  // Item 001 has no tags.
  await userEvent.click(
    (await row(1)).getByRole('button', { name: 'Tags: None' }),
  )
  await check('Electrical')
  await check('Safety')
  expect(update).not.toHaveBeenCalled()
  await userEvent.keyboard('{Escape}')
  await waitFor(() =>
    expect(source.items()[0].tags).toEqual(['electrical', 'safety']),
  )
  expect(update).toHaveBeenCalledTimes(1)
  expect(
    (await row(1)).getByRole('button', { name: 'Tags: Electrical, Safety' }),
  ).toBeInTheDocument()
})

test('a tag is removed by unchecking it', async () => {
  const source = show()
  // Item 003 has Safety and Hydraulic.
  await userEvent.click(
    (await row(3)).getByRole('button', { name: 'Tags: Safety, Hydraulic' }),
  )
  await check('Safety')
  await userEvent.keyboard('{Escape}')
  await waitFor(() => expect(source.items()[2].tags).toEqual(['hydraulic']))
})

test('a refused change goes back, with a message', async () => {
  const source = show()
  await userEvent.click(
    (await row(2)).getByRole('button', { name: 'Tags: Mechanical' }),
  )
  await check('Safety')
  source.settings.failing = true
  await userEvent.keyboard('{Escape}')
  expect(
    await screen.findByText("“Tags” couldn't be saved for Item 002."),
  ).toBeInTheDocument()
  expect(
    (await row(2)).getByRole('button', { name: 'Tags: Mechanical' }),
  ).toBeInTheDocument()
})

test('the panel chooses tags too', async () => {
  const source = show()
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 004' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 004' })
  await reachValue(aside, 'Tags')
  await userEvent.click(
    within(aside).getByRole('button', { name: 'Tags: Hydraulic' }),
  )
  await check('Mechanical')
  await userEvent.keyboard('{Escape}')
  await waitFor(() =>
    expect(source.items()[3].tags).toEqual(['mechanical', 'hydraulic']),
  )
})

test('without the right, the tags are chips only', async () => {
  show(() => ({ edit: [] }))
  const cells = await row(3)
  expect(cells.queryByRole('button', { name: /^Tags/ })).toBeNull()
  expect(cells.getByText('Safety')).toBeInTheDocument()
})

test('the chips show the first ones, then +n', () => {
  render(<ChipList labels={['A', 'B', 'C', 'D']} max={2} />)
  expect(screen.getByText('A')).toBeInTheDocument()
  expect(screen.queryByText('C')).toBeNull()
  expect(screen.getByText('+2')).toBeInTheDocument()
})
