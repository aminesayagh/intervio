import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import '../../../i18n'
import '../../index'
import * as notifications from '../../../notifications'
import { editorOf, enter, markdownOf, selectAll } from '../../testing/plate'
import { Description } from '../Description'

// The stand-in sample answer is made unreadable, to see Accept fail.
vi.mock('./plugins', async (original) => {
  const plugins = await original<typeof import('./plugins')>()
  return {
    ...plugins,
    parseMarkdown: (...args: Parameters<typeof plugins.parseMarkdown>) =>
      args[1].startsWith('Check the seals')
        ? { ok: false, error: new Error('unreadable') }
        : plugins.parseMarkdown(...args),
  }
})

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
  // The floating toolbar, over the selected text.
  await userEvent.click(
    within(screen.getByRole('toolbar')).getByRole('button', { name: 'Ask AI' }),
  )
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

async function ask(prompt: string) {
  // The header's button (first in the page): it asks with or without a selection.
  await userEvent.click(screen.getAllByRole('button', { name: 'Ask AI' })[0])
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'What should the AI do?' }),
    prompt,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Ask' }))
  const proposal = screen.getByRole('group', { name: 'AI proposal' })
  await vi.waitFor(
    () =>
      expect(
        within(proposal).getByRole('button', { name: 'Accept' }),
      ).toBeEnabled(),
    { timeout: 3000 },
  )
  return proposal
}

test('Accept replaces the text asked about, even after edits above it', async () => {
  render(
    <Description
      value={`Intro.\n\n${TEXT}`}
      editable
      storageKey="ai-moved"
      scope="test"
      save={async () => {}}
    />,
  )
  const field = screen.getByRole('textbox', { name: 'Description' })
  const editor = editorOf(field)
  await enter(field)
  await act(async () =>
    editor.tf.select({
      anchor: editor.api.start([1])!,
      focus: editor.api.end([1])!,
    }),
  )
  const proposal = await ask('Make it shorter')
  // Written while the AI answered: the paragraph asked about moves down.
  await act(async () =>
    editor.tf.insertNodes(
      { type: 'p', children: [{ text: 'Added' }] },
      { at: [0] },
    ),
  )
  await userEvent.click(
    within(proposal).getByRole('button', { name: 'Accept' }),
  )
  expect(markdownOf(field)).toBe(
    'Added\n\nIntro.\n\nSeals are checked once a year.',
  )
})

test('a proposal the editor cannot read is reported, not applied', async () => {
  const notify = vi.spyOn(notifications, 'notify')
  render(
    <Description
      value={TEXT}
      editable
      storageKey="ai-unreadable"
      scope="test:record:1"
      save={async () => {}}
    />,
  )
  const field = screen.getByRole('textbox', { name: 'Description' })
  await enter(field)
  const proposal = await ask('Rewrite it')
  await userEvent.click(
    within(proposal).getByRole('button', { name: 'Accept' }),
  )
  expect(markdownOf(field)).toBe(TEXT)
  expect(notify).toHaveBeenCalledWith(
    expect.objectContaining({
      tone: 'error',
      text: "The AI couldn't answer.",
      scope: 'test:record:1',
    }),
  )
})
