import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { Description } from './Description'
import { itemSource, makeItems } from '../testing/items'
import {
  clearEditor,
  enter,
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

test('read-only, it is shown formatted, raw HTML is not rendered, and links open in a new tab', () => {
  const { container } = render(
    <Description
      value={
        '**Bold** <b>raw</b>\n\n- one\n- two\n\n[site](https://example.com)'
      }
      editable={false}
      storageKey="test"
      scope="test"
      save={async () => {}}
    />,
  )
  expect(container.querySelector('strong')).toHaveTextContent('Bold')
  expect(container.querySelector('b')).toBeNull()
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  const link = screen.getByRole('link', { name: 'site' })
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
})

async function openRecord(source = itemSource(makeItems(3))) {
  renderAt('/items', <Collection definition={itemDefinition(source)} />)
  await userEvent.click(
    await screen.findByRole('button', { name: 'Open Item 001' }),
  )
  const aside = await screen.findByRole('complementary', { name: 'Item 001' })
  // The description is in its editor from the start: nothing to click into.
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
  const { field } = await openRecord(source)
  await enter(field)
  fireEvent.keyDown(field, { key: 'Escape' })
  fireEvent.focusOut(field)
  await new Promise((done) => setTimeout(done, 1200))
  expect(update).not.toHaveBeenCalled()
  expect(source.items()[0].description).toBe(
    '* Seals\n* Bearings\n\nKeep it *soft*',
  )
})

test('the description saves by itself, says Saved, and Escape leaves the text', async () => {
  const { source, aside, field } = await openRecord()
  await enter(field)
  await clearEditor(field)
  await typeIn(field, 'Seals ')
  await userEvent.click(within(aside).getByRole('button', { name: 'Bold' }))
  await typeIn(field, 'checked')
  expect(
    await within(aside).findByText('Saved', undefined, { timeout: 3000 }),
  ).toBeInTheDocument()
  expect(source.items()[0].description).toBe('Seals **checked**')
  expect(within(field).getByText('checked').closest('strong')).not.toBeNull()

  fireEvent.keyDown(field, { key: 'Escape' })
  expect(document.activeElement).toBe(
    within(aside).getByRole('region', { name: 'Description' }),
  )
})

test('a failed save says Not saved, keeps the text, and Retry saves it', async () => {
  const { source, aside, field } = await openRecord()
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

test('it is edited in place, the toolbar shows with the cursor in it, and Bold wraps the selection', async () => {
  const { aside, field } = await openRecord()
  expect(field).toHaveAttribute('contenteditable', 'true')
  expect(within(aside).queryByRole('tab')).toBeNull()
  expect(within(aside).queryByRole('button', { name: 'Bold' })).toBeNull()

  await enter(field)
  await clearEditor(field)
  await typeIn(field, 'pump')
  await selectAll(field)
  await userEvent.click(within(aside).getByRole('button', { name: 'Bold' }))
  expect(markdownOf(field)).toBe('**pump**')
  expect(within(field).getByText('pump').closest('strong')).not.toBeNull()
})

test('a description over 20,000 characters is refused, and not saved', async () => {
  const { source, aside, field } = await openRecord()
  await replaceText(field, 'x'.repeat(20_001))
  expect(
    within(aside).getByText(
      'This description is too long: 20,000 characters at most.',
    ),
  ).toBeInTheDocument()
  await new Promise((done) => setTimeout(done, 1200))
  expect(source.items()[0].description).toBe(makeItems(1)[0].description)
})

test('without the right, the same editor is read-only', async () => {
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
  // Read-only, Slate gives the text no textbox role: it is found as the editor.
  const field = within(
    within(aside).getByRole('region', { name: 'Description' }),
  ).getByLabelText('Description')
  expect(field).toHaveAttribute('contenteditable', 'false')
  expect(within(field).getByText('Item 001').closest('strong')).not.toBeNull()
  await enter(field)
  expect(within(aside).queryByRole('button', { name: 'Bold' })).toBeNull()
})

test('empty, it invites a description when editable, and shows nothing when not', () => {
  const props = { value: '', storageKey: 'x', scope: 'x', save: async () => {} }
  const { unmount } = render(<Description {...props} editable />)
  expect(screen.getByRole('textbox', { name: 'Description' })).toHaveAttribute(
    'aria-placeholder',
    'Add a description',
  )
  unmount()
  const { container } = render(<Description {...props} editable={false} />)
  expect(container).toBeEmptyDOMElement()
})

test('a draft kept in the tab is saved when the description opens again', async () => {
  sessionStorage.setItem('draft-key', 'Seals **checked**')
  const save = vi.fn(async () => {})
  render(
    <Description
      value="Seals"
      editable
      storageKey="draft-key"
      scope="test"
      save={save}
    />,
  )
  expect(
    await screen.findByText('Saved', undefined, { timeout: 3000 }),
  ).toBeInTheDocument()
  expect(save).toHaveBeenCalledWith('Seals **checked**')
  expect(sessionStorage.getItem('draft-key')).toBeNull()
})

test('a newer text from the record replaces the one shown, unless the person is in it', async () => {
  const props = {
    editable: true,
    storageKey: 'newer',
    scope: 'test',
    save: async () => {},
  }
  const { rerender } = render(<Description {...props} value="Seals" />)
  rerender(<Description {...props} value="Seals and bearings" />)
  expect(markdownOf(screen.getByRole('textbox', { name: 'Description' }))).toBe(
    'Seals and bearings',
  )

  await enter(screen.getByRole('textbox', { name: 'Description' }))
  rerender(<Description {...props} value="Something else" />)
  expect(markdownOf(screen.getByRole('textbox', { name: 'Description' }))).toBe(
    'Seals and bearings',
  )
})
