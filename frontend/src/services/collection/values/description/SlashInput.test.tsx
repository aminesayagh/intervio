import { act, cleanup, render, screen } from '@testing-library/react'
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
