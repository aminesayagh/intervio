import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { usePath } from '../../navigation'
import { Collection } from '../Collection'
import { checkDefinition, checkSource } from '../testing/checks'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { seeSections } from '../testing/panel'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

const ITEM_001 = '00000000-0000-7000-8000-000000000001'
/** Item 001's first check. */
const CHECK = '00000000-0000-7000-a000-000000000001'
const CHECKS_PAGE = /^\/items\/([^/]+)\/checks/

/** Items with checks that live inside each item, each list at its own address. */
function show(url: string) {
  const checks = checkSource()
  const checksDefinition = checkDefinition(checks)
  const items = itemDefinition(
    itemSource(makeItems(8)),
    'test-items',
    undefined,
    undefined,
    '/items',
    () => checksDefinition,
  )
  function Pages() {
    const item = CHECKS_PAGE.exec(usePath())?.[1]
    return item ? (
      <Collection key={item} definition={checksDefinition} context={{ item }} />
    ) : (
      <Collection key="items" definition={items} />
    )
  }
  renderAt(url, <Pages />)
  return checks
}

async function checksSection() {
  const aside = await screen.findByRole('complementary', { name: 'Item 001' })
  seeSections()
  return (await within(aside).findByText('Checks')).closest('section')!
}

test('a record opened from a section is read and saved within its parent', async () => {
  const checks = show(`/items?open=${ITEM_001}`)
  await userEvent.click(
    await within(await checksSection()).findByRole('button', {
      name: 'Check 1, Item 001',
    }),
  )
  const panel = await screen.findByRole('complementary', {
    name: 'Check 1, Item 001',
  })
  const title = await within(panel).findByRole('textbox', { name: 'Title' })
  await userEvent.clear(title)
  await userEvent.type(title, 'Pressure{Enter}')
  await waitFor(() =>
    expect(checks.items().find((check) => check.id === CHECK)?.name).toBe(
      'Pressure',
    ),
  )
  // Every request asked within Item 001: none without it.
  expect(checks.asked.every((context) => context?.item === ITEM_001)).toBe(true)
})

test('after a refresh, the linked record finds its context from the address', async () => {
  const checks = show(`/items?open=${ITEM_001}&linked=test-checks:${CHECK}`)
  expect(
    await screen.findByRole('complementary', { name: 'Check 1, Item 001' }),
  ).toBeInTheDocument()
  expect(checks.asked.every((context) => context?.item === ITEM_001)).toBe(true)
})

test('"Show all" opens the list at its parent\'s address, asked within it', async () => {
  const checks = show(`/items?open=${ITEM_001}`)
  await userEvent.click(
    await within(await checksSection()).findByRole('button', {
      name: /Show all/,
    }),
  )
  await waitFor(() =>
    expect(window.location.pathname).toBe(`/items/${ITEM_001}/checks`),
  )
  // The list of Item 001's seven checks, and none of another item's.
  expect(await screen.findByText('7 checks')).toBeInTheDocument()
  expect(checks.asked.every((context) => context?.item === ITEM_001)).toBe(true)
})
