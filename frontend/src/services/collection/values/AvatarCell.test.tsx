import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

// A wide list, so the Picture column fits in the table.
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
const rowOf = async (n: number) =>
  (await screen.findByRole('grid')).querySelectorAll('[role="row"][data-key]')[
    n - 1
  ] as HTMLElement
const chooser = (scope: HTMLElement) =>
  scope.querySelector<HTMLInputElement>('input[type="file"]')!
const picture = (name: string, size = 1024) => {
  const file = new File(['x'], name, {
    type: name.endsWith('.png') ? 'image/png' : 'application/pdf',
  })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

test('a picture chosen from the table is uploaded and saved', async () => {
  const source = show()
  // Item 002 has no picture.
  await userEvent.upload(chooser(await rowOf(2)), picture('pump.png'))
  await waitFor(() => expect(source.items()[1].avatar?.name).toBe('pump.png'))
})

test('a file that is not a picture, or too large, is refused with a message', async () => {
  const source = show()
  // The browser's file chooser already filters by type; this checks what gets past it.
  const user = userEvent.setup({ applyAccept: false })
  await user.upload(chooser(await rowOf(2)), picture('plan.pdf'))
  expect(
    await screen.findByText(
      "That file isn't a picture (PNG, JPG, JPEG). It was put back.",
    ),
  ).toBeInTheDocument()
  await userEvent.upload(
    chooser(await rowOf(2)),
    picture('huge.png', 3 * 1024 * 1024),
  )
  expect(
    await screen.findByText('The picture is over 2 MB. It was put back.'),
  ).toBeInTheDocument()
  expect(source.items()[1].avatar).toBeNull()
})

test('a refused save keeps the old picture, with a message', async () => {
  const source = show()
  source.settings.failing = true
  await userEvent.upload(chooser(await rowOf(1)), picture('new.png'))
  expect(
    await screen.findByText("“Picture” couldn't be saved for Item 001."),
  ).toBeInTheDocument()
  expect(source.items()[0].avatar?.name).toBe('IT001.png')
})

test('the panel removes the picture', async () => {
  const source = show()
  // Item 001 has a picture.
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 001' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 001' })
  await userEvent.click(within(aside).getByRole('button', { name: 'Remove' }))
  await waitFor(() => expect(source.items()[0].avatar).toBeNull())
  expect(
    within(aside).getByRole('button', { name: 'Upload' }),
  ).toBeInTheDocument()
})

test('without the right, the picture is shown only', async () => {
  show(() => ({ edit: [] }))
  const row = await rowOf(1)
  expect(row.querySelector('input[type="file"]')).toBeNull()
  expect(row.querySelector('img')).not.toBeNull()
})
