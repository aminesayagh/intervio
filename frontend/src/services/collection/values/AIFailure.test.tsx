import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import '../../i18n'
import '../index'
import * as notifications from '../../notifications'
import { enter, markdownOf, selectAll } from '../../richText/testing/plate'
import { RichText } from './RichText'
import type { DescriptionContext } from '../../richText/ai/simulatedAI'

// The backend refuses, as it does once the person has asked too often (decision 153);
// what the editor sent is kept, to check it.
const sent: DescriptionContext[] = []
vi.mock('../../richText/ai/simulatedAI', () => ({
  simulatedTransport: () => ({
    async sendMessages({ body }: { body: { ctx: DescriptionContext } }) {
      sent.push(body.ctx)
      throw new Error('{"code":"ERROR_AI_LIMIT"}')
    },
    reconnectToStream: async () => null,
  }),
}))

afterEach(cleanup)

test('the AI gets the text and the selection as Markdown; a refusal is a notification', async () => {
  const notify = vi.spyOn(notifications, 'notify')
  const text = 'Seals are checked **once a year**.'
  render(
    <RichText
      value={text}
      editable
      storageKey="ai-refused"
      scope="test:record:1"
      save={async () => {}}
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
  await userEvent.keyboard('{Enter}')

  await vi.waitFor(() =>
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: 'error',
        text: "You've asked the AI too often. Try again later.",
        scope: 'test:record:1',
      }),
    ),
  )
  expect(sent).toEqual([{ document: text, selection: text, toolName: 'edit' }])
  expect(
    screen.queryByRole('group', { name: 'AI proposal' }),
  ).not.toBeInTheDocument()
  expect(markdownOf(field)).toBe(text)
})
