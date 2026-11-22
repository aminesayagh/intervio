import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

// A wide list, so the Files column fits in the table.
beforeAll(() => stubElementSizes({ width: 3000, height: 400, itemHeight: 152 }))
afterEach(cleanup)

function show(rights?: Parameters<typeof itemDefinition>[2]) {
  const source = itemSource(makeItems(5))
  renderAt(
    '/items',
    <Collection definition={itemDefinition(source, 'test-items', rights)} />,
  )
  return source
}
async function panel(name: string) {
  await userEvent.click(
    await screen.findByRole('button', { name: `Open ${name}` }),
  )
  return screen.findByRole('complementary', { name })
}
const document = (name: string) =>
  new File(['x'], name, { type: 'application/pdf' })

test('the table shows the count, and clicking it opens the record', async () => {
  show()
  const table = await screen.findByRole('table')
  // Item 003 has two files.
  const third = within(
    table.querySelectorAll('tbody tr[data-index]')[2] as HTMLElement,
  )
  await userEvent.click(third.getByText('2 files'))
  expect(
    await screen.findByRole('complementary', { name: 'Item 003' }),
  ).toBeInTheDocument()
})

test('files added in the panel are uploaded and saved with the others', async () => {
  const source = show()
  const aside = await panel('Item 002')
  const chooser = aside.querySelector<HTMLInputElement>(
    'input[type="file"][multiple]',
  )!
  await userEvent.upload(chooser, [
    document('report.pdf'),
    document('photo.png'),
  ])
  await waitFor(() =>
    expect(source.items()[1].files.map((f) => f.name)).toEqual([
      'plan-002.pdf',
      'report.pdf',
      'photo.png',
    ]),
  )
})

test('a file is removed from the panel', async () => {
  const source = show()
  const aside = await panel('Item 003')
  await userEvent.click(
    within(aside).getByRole('button', { name: 'Remove plan-003.pdf' }),
  )
  await waitFor(() =>
    expect(source.items()[2].files.map((f) => f.name)).toEqual([
      'checklist-003.xlsx',
    ]),
  )
})

test('a file of a kind the field does not take is refused, the others still go', async () => {
  const source = show()
  const aside = await panel('Item 001')
  const user = userEvent.setup({ applyAccept: false })
  await user.upload(
    aside.querySelector<HTMLInputElement>('input[type="file"][multiple]')!,
    [document('tool.exe'), document('ok.pdf')],
  )
  expect(
    await screen.findByText(
      "tool.exe isn't a document this field takes. It was put back.",
    ),
  ).toBeInTheDocument()
  await waitFor(() =>
    expect(source.items()[0].files.map((f) => f.name)).toEqual(['ok.pdf']),
  )
})

test('without the right, the files are links only', async () => {
  show(() => ({ edit: [] }))
  const aside = await panel('Item 003')
  expect(
    within(aside).getByRole('link', { name: 'plan-003.pdf' }),
  ).toHaveAttribute('target', '_blank')
  expect(
    within(aside).queryByRole('button', { name: /Remove plan/ }),
  ).toBeNull()
  expect(
    within(aside).queryByRole('button', { name: '+ Add files' }),
  ).toBeNull()
})
