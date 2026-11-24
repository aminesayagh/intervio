import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { MarkdownView } from './Description'
import { itemSource, makeItems } from '../testing/items'
import {
  clearEditor,
  editorOf,
  markdownOf,
  replaceText,
  selectAll,
  typeIn,
} from '../testing/plate'
import { stubElementSizes } from '../testing/layout'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

test('Markdown is shown formatted, and raw HTML is not rendered', () => {
  const { container } = render(
    <MarkdownView
      text={
        '**Bold** <b>raw</b>\n\n- one\n- [x] done\n\n[site](https://example.com)'
      }
    />,
  )
  expect(container.querySelector('strong')).toHaveTextContent('Bold')
  expect(container.querySelector('b')).toBeNull()
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(screen.getByRole('checkbox')).toBeChecked()
  expect(screen.getByRole('link', { name: 'site' })).toHaveAttribute(
    'target',
    '_blank',
  )
})

async function openDescription() {
  const source = itemSource(makeItems(3))
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 001' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 001' })
  await userEvent.click(
    within(aside).getByRole('button', { name: 'Edit the description' }),
  )
  const field = await within(aside).findByRole('textbox', {
    name: 'Description',
  })
  return { source, aside, field }
}

test('opening and leaving never saves, even text Plate writes its own way', async () => {
  // Plate writes "*" bullets as "-" and "*soft*" as "_soft_": not an edit.
  const items = makeItems(3)
  items[0].description = '* Seals\n* Bearings\n\nKeep it *soft*'
  const source = itemSource(items)
  const update = vi.spyOn(source, 'update')
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 001' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 001' })
  await userEvent.click(
    within(aside).getByRole('button', { name: 'Edit the description' }),
  )
  const field = await within(aside).findByRole('textbox', {
    name: 'Description',
  })
  fireEvent.blur(field)
  fireEvent.keyDown(field, { key: 'Escape' })
  await waitFor(() => expect(field).not.toBeInTheDocument())
  await new Promise((done) => setTimeout(done, 1200))
  expect(update).not.toHaveBeenCalled()
  expect(source.items()[0].description).toBe(
    '* Seals\n* Bearings\n\nKeep it *soft*',
  )
})

test('the description saves by itself, says Saved, and Escape shows it formatted', async () => {
  const { source, aside, field } = await openDescription()
  await clearEditor(field)
  await typeIn(field, 'Seals ')
  await userEvent.click(within(aside).getByRole('button', { name: 'Bold' }))
  await typeIn(field, 'checked')
  expect(
    await within(aside).findByText('Saved', undefined, { timeout: 3000 }),
  ).toBeInTheDocument()
  expect(source.items()[0].description).toBe('Seals **checked**')

  fireEvent.keyDown(field, { key: 'Escape' })
  // The editor shows "checked" bold too: wait for it to close first.
  await waitFor(() => expect(field).not.toBeInTheDocument())
  expect(await within(aside).findByText('checked')).toHaveProperty(
    'tagName',
    'STRONG',
  )
})

test('a failed save says Not saved, keeps the text, and Retry saves it', async () => {
  const { source, aside, field } = await openDescription()
  source.settings.failing = true
  await typeIn(field, ' more')
  expect(
    await within(aside).findByText('Not saved', undefined, { timeout: 3000 }),
  ).toBeInTheDocument()
  expect(markdownOf(field)).toBe(`${makeItems(1)[0].description} more`)

  source.settings.failing = false
  await userEvent.click(within(aside).getByRole('button', { name: 'Retry' }))
  expect(await within(aside).findByText('Saved')).toBeInTheDocument()
  expect(source.items()[0].description).toBe(
    `${makeItems(1)[0].description} more`,
  )
})

test('Preview shows the text formatted, and Bold wraps the selection', async () => {
  const { aside, field } = await openDescription()
  await clearEditor(field)
  await typeIn(field, 'pump')
  await selectAll(field)
  await userEvent.click(within(aside).getByRole('button', { name: 'Bold' }))
  expect(markdownOf(field)).toBe('**pump**')

  await userEvent.click(within(aside).getByRole('tab', { name: 'Preview' }))
  expect(await within(aside).findByText('pump')).toHaveProperty(
    'tagName',
    'STRONG',
  )
})

test('a description over 20,000 characters is refused, and not saved', async () => {
  const { source, aside, field } = await openDescription()
  await replaceText(field, 'x'.repeat(20_001))
  expect(
    within(aside).getByText(
      'This description is too long: 20,000 characters at most.',
    ),
  ).toBeInTheDocument()
  await new Promise((done) => setTimeout(done, 1200))
  expect(source.items()[0].description).toBe(makeItems(1)[0].description)
})

test('without the right, the description is shown but not editable', async () => {
  const source = itemSource(makeItems(3))
  renderAt(
    '/items',
    <Collection
      definition={itemDefinition(source, 'test-items', () => ({ edit: [] }))}
    />,
  )
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 001' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 001' })
  expect(
    within(aside).getByText('Item 001', { selector: 'strong' }),
  ).toBeInTheDocument()
  expect(
    within(aside).queryByRole('button', { name: 'Edit the description' }),
  ).toBeNull()
})

test('the editor opens with the cursor after the text', async () => {
  const { field } = await openDescription()
  const editor = editorOf(field)
  expect(editor.selection?.focus).toEqual(editor.api.end([]))
})
