import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'
import '../../../i18n'
import '../../index'
import { editorOf, enter, markdownOf, typeIn } from '../../testing/plate'
import { EditorText, PlateEditor } from './PlateEditor'
import { DescriptionAI } from './AskAI'

afterEach(cleanup)

/**
 * The editor with "Pump " typed, then "/": the menu of blocks open. The space stays
 * in the text (Markdown writes a final space as &#x20;).
 */
async function slash(initial = 'Pump') {
  render(
    <PlateEditor
      initial={initial}
      onChange={() => {}}
      onFailure={() => {}}
      fallback={null}
    >
      <DescriptionAI scope="test">
        <EditorText aria-label="Description" />
      </DescriptionAI>
    </PlateEditor>,
  )
  const field = screen.getByRole('textbox', { name: 'Description' })
  await enter(field)
  await typeIn(field, ' ')
  await typeIn(field, '/')
  return field
}

test('"/" opens the blocks, the typing filters them, Enter turns the line', async () => {
  const field = await slash()
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'Turn into' }),
    'num',
  )
  expect(
    screen.getAllByRole('menuitem').map((item) => item.textContent),
  ).toEqual(['Numbered list'])
  await userEvent.keyboard('{Enter}')
  expect(screen.queryByRole('menu')).toBeNull()
  expect(markdownOf(field)).toBe('1. Pump&#x20;')
})

test('the blocks come in titled groups, AI first; Heading 3 turns the line', async () => {
  const field = await slash()
  const menu = await screen.findByRole('menu')
  expect(
    within(menu)
      .getAllByRole('group')
      .map((group) => group.getAttribute('aria-label') ?? group.textContent),
  ).toHaveLength(2)
  expect(
    screen.getAllByRole('menuitem').map((item) => item.textContent),
  ).toEqual([
    'Ask AI',
    'Text',
    'Heading 1',
    'Heading 2',
    'Heading 3',
    'Bulleted list',
    'Numbered list',
    'To-do list',
    'Toggle',
    'Code block',
    'Table',
    'Blockquote',
    'Callout',
  ])
  await userEvent.click(screen.getByRole('menuitem', { name: 'Heading 3' }))
  expect(markdownOf(field)).toBe('### Pump&#x20;')
})

test('To-do list turns the line into a checklist item, ticked by its checkbox', async () => {
  const field = await slash()
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'To-do list' }),
  )
  expect(markdownOf(field)).toBe('- [ ] Pump&#x20;')
  await userEvent.click(screen.getByRole('checkbox'))
  expect(markdownOf(field)).toBe('- [x] Pump&#x20;')
})

test.each([
  ['Blockquote', '> Pump&#x20;'],
  ['Callout', '<callout icon="💡">Pump </callout>'],
  ['Code block', '```\nPump \n```'],
  ['Toggle', '<details>\n<summary>Pump&#x20;</summary>\n\n</details>'],
])('%s turns the line', async (name, markdown) => {
  const field = await slash()
  await userEvent.click(await screen.findByRole('menuitem', { name }))
  expect(markdownOf(field)).toBe(markdown)
})

test('a list line leaves its list to become a toggle', async () => {
  const field = await slash('- Pump')
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Toggle' }))
  expect(markdownOf(field)).toBe(
    '<details>\n<summary>Pump&#x20;</summary>\n\n</details>',
  )
})

test('after a block, the caret stays on its line (a callout above)', async () => {
  const field = await slash('<callout icon="💡">Watch</callout>\n\nPump')
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Blockquote' }),
  )
  await act(() => new Promise(requestAnimationFrame))
  await typeIn(field, 'x')
  expect(markdownOf(field)).toBe(
    '<callout icon="💡">Watch</callout>\n\n> Pump x',
  )
})

test('Enter on an empty last line leaves a code block', async () => {
  const field = await slash()
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Code block' }),
  )
  await act(() => new Promise(requestAnimationFrame))
  await act(async () => editorOf(field).tf.insertBreak())
  await act(async () => editorOf(field).tf.insertBreak())
  await typeIn(field, 'After')
  expect(markdownOf(field)).toBe('```\nPump \n```\n\nAfter')
})

test('"/" in a code block is code: no menu', async () => {
  const field = await slash()
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Code block' }),
  )
  await act(() => new Promise(requestAnimationFrame))
  await typeIn(field, '/')
  expect(screen.queryByRole('menu')).toBeNull()
  expect(markdownOf(field)).toBe('```\nPump /\n```')
})

test('Table on an empty line takes its place', async () => {
  const field = await slash('')
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Table' }))
  expect(editorOf(field).children.map((block) => block.type)).toEqual(['table'])
})

test('Table adds a table of three by three', async () => {
  const field = await slash()
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Table' }))
  expect(field.querySelectorAll('tr')).toHaveLength(3)
  expect(field.querySelectorAll('tr:first-child > *')).toHaveLength(3)
})

test('"/" then Ask AI opens the requests, about the whole text', async () => {
  await slash()
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Ask AI' }))
  expect(
    await screen.findByRole('textbox', { name: 'What should the AI do?' }),
  ).toBeInTheDocument()
})

test('Escape puts the typed text back; Backspace on nothing removes the "/"', async () => {
  const field = await slash()
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'Turn into' }),
    'li{Escape}',
  )
  expect(screen.queryByRole('menu')).toBeNull()
  expect(markdownOf(field)).toBe('Pump /li')
  // The editor places the caret and takes the focus back a frame later.
  await act(() => new Promise(requestAnimationFrame))

  await typeIn(field, ' ')
  await typeIn(field, '/')
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'Turn into' }),
    '{Backspace}',
  )
  expect(screen.queryByRole('menu')).toBeNull()
  expect(markdownOf(field)).toBe('Pump /li&#x20;')
})
