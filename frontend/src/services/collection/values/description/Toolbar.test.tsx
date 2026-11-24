import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'
import '../../../i18n'
import '../../index'
import { enter, markdownOf, selectAll, typeIn } from '../../testing/plate'
import { EditorText, PlateEditor } from './PlateEditor'
import { DescriptionAI } from './AskAI'
import { Toolbar } from './Toolbar'

afterEach(cleanup)

async function renderEditor(initial = '') {
  render(
    <PlateEditor
      initial={initial}
      onChange={() => {}}
      onFailure={() => {}}
      fallback={null}
    >
      <DescriptionAI scope="test">
        <Toolbar scope="test" />
        <EditorText aria-label="Description" />
      </DescriptionAI>
    </PlateEditor>,
  )
  const field = screen.getByRole('textbox', { name: 'Description' })
  await enter(field)
  return field
}

test.each([
  ['Heading', '## Pump'],
  ['List', '- Pump'],
  ['Numbered list', '1. Pump'],
])('%s formats the line', async (name, markdown) => {
  const field = await renderEditor('Pump')
  await userEvent.click(screen.getByRole('button', { name }))
  expect(markdownOf(field)).toBe(markdown)
})

test('Link puts the address on the selection', async () => {
  const field = await renderEditor()
  await typeIn(field, 'manual')
  await selectAll(field)
  await userEvent.click(screen.getByRole('button', { name: 'Link' }))
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'Link address' }),
    'https://example.com/manual',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(markdownOf(field)).toBe('[manual](https://example.com/manual)')
})
