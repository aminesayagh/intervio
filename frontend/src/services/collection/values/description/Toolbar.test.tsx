import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'
import '../../../i18n'
import '../../index'
import { markdownOf, selectAll, typeIn } from '../../testing/plate'
import { EditorText, PlateEditor } from './PlateEditor'
import { Toolbar } from './Toolbar'

afterEach(cleanup)

function renderEditor(initial = '') {
  render(
    <PlateEditor initial={initial} onChange={() => {}} onFailure={() => {}}>
      <Toolbar scope="test" />
      <EditorText aria-label="Description" />
    </PlateEditor>,
  )
  return screen.getByRole('textbox', { name: 'Description' })
}

test.each([
  ['Heading', '## Pump'],
  ['List', '- Pump'],
  ['Numbered list', '1. Pump'],
])('%s formats the line', async (name, markdown) => {
  const field = renderEditor('Pump')
  await userEvent.click(screen.getByRole('button', { name }))
  expect(markdownOf(field)).toBe(markdown)
})

test('Link puts the address on the selection', async () => {
  const field = renderEditor()
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
