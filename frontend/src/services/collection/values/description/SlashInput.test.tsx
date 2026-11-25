import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'
import '../../../i18n'
import '../../index'
import { enter, markdownOf, typeIn } from '../../testing/plate'
import { EditorText, PlateEditor } from './PlateEditor'
import { DescriptionAI } from './AskAI'

afterEach(cleanup)

/**
 * The editor with "Pump " typed, then "/": the menu of blocks open. The space stays
 * in the text (Markdown writes a final space as &#x20;).
 */
async function slash() {
  render(
    <PlateEditor
      initial="Pump"
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
