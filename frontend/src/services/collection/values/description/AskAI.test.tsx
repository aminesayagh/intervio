import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import '../../../i18n'
import '../../index'
import { enter, markdownOf, selectAll } from '../../testing/plate'
import { Description } from '../Description'

afterEach(cleanup)

const TEXT = 'Seals are checked once a year. Bearings are greased every month.'

async function askShorter() {
  const save = vi.fn(async () => {})
  render(
    <Description
      value={TEXT}
      editable
      storageKey="ai"
      scope="test:record:1"
      save={save}
    />,
  )
  const field = screen.getByRole('textbox', { name: 'Description' })
  await enter(field)
  await selectAll(field)
  await userEvent.click(screen.getByRole('button', { name: 'Ask AI' }))
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'What should the AI do?' }),
    'Make it shorter',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Ask' }))
  const proposal = screen.getByRole('group', { name: 'AI proposal' })
  // The answer streams in; Accept waits for its end.
  await vi.waitFor(
    () =>
      expect(
        within(proposal).getByRole('button', { name: 'Accept' }),
      ).toBeEnabled(),
    { timeout: 3000 },
  )
  expect(proposal).toHaveTextContent('Seals are checked once a year.')
  // Proposed, not applied: the text and the record are untouched.
  expect(markdownOf(field)).toBe(TEXT)
  expect(save).not.toHaveBeenCalled()
  return { field, proposal, save }
}

test('Accept puts the AI proposal in place of the selection, then saves it', async () => {
  const { field, proposal, save } = await askShorter()
  await userEvent.click(
    within(proposal).getByRole('button', { name: 'Accept' }),
  )
  expect(markdownOf(field)).toBe('Seals are checked once a year.')
  expect(screen.queryByRole('group', { name: 'AI proposal' })).toBeNull()
  await vi.waitFor(
    () => expect(save).toHaveBeenCalledWith('Seals are checked once a year.'),
    { timeout: 3000 },
  )
})

test('Reject drops the AI proposal and leaves the text as it was', async () => {
  const { field, proposal, save } = await askShorter()
  await userEvent.click(
    within(proposal).getByRole('button', { name: 'Reject' }),
  )
  expect(screen.queryByRole('group', { name: 'AI proposal' })).toBeNull()
  expect(markdownOf(field)).toBe(TEXT)
  await new Promise((done) => setTimeout(done, 1200))
  expect(save).not.toHaveBeenCalled()
})
