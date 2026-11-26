import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import type { ChatTransport, UIMessage } from 'ai'
import '../../i18n'
import '../index'
import * as notifications from '../../notifications'
import { enter, markdownOf, selectAll } from '../testing/plate'
import { simulatedTransport } from '../testing/simulatedAI'
import { TestEditor } from '../testing/TestEditor'
import type { DescriptionContext } from './aiContext'

// The backend refuses, as it does once the person has asked too often (decision 153);
// what the editor sent is kept, to check it.
const sent: DescriptionContext[] = []
const refusing = {
  async sendMessages({ body }: { body?: object }) {
    sent.push((body as { ctx: DescriptionContext }).ctx)
    throw new Error('{"code":"ERROR_AI_LIMIT"}')
  },
  reconnectToStream: async () => null,
} as ChatTransport<UIMessage>

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('the AI gets the text and the selection as Markdown; a refusal is a notification', async () => {
  const notify = vi.spyOn(notifications, 'notify')
  const text = 'Seals are checked **once a year**.'
  render(<TestEditor value={text} transport={refusing} />)
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
        // Asking again now won't help: no Retry.
        action: undefined,
      }),
    ),
  )
  expect(sent).toEqual([{ document: text, selection: text, toolName: 'edit' }])
  expect(
    screen.queryByRole('group', { name: 'AI proposal' }),
  ).not.toBeInTheDocument()
  expect(markdownOf(field)).toBe(text)
})

test('an answer that failed offers Retry: the same request, then the proposal (MAS-12)', async () => {
  const notify = vi.spyOn(notifications, 'notify')
  const answering = simulatedTransport(0)
  const asked: { prompt: string; ctx: DescriptionContext }[] = []
  let calls = 0
  const failingOnce = {
    async sendMessages(options: Parameters<typeof answering.sendMessages>[0]) {
      const message = options.messages.at(-1)!
      asked.push({
        prompt: message.parts
          .map((part) => (part.type === 'text' ? part.text : ''))
          .join(''),
        ctx: (options.body as { ctx: DescriptionContext }).ctx,
      })
      if (calls++ === 0) throw new Error('{"code":"ERROR_AI_FAILED"}')
      return answering.sendMessages(options)
    },
    reconnectToStream: async () => null,
  } as ChatTransport<UIMessage>
  const text = 'Seals are checked once a year.'
  render(<TestEditor value={text} transport={failingOnce} />)
  const field = screen.getByRole('textbox', { name: 'Description' })
  await enter(field)
  await selectAll(field)
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
        text: "The AI couldn't answer.",
        action: expect.objectContaining({ label: 'Retry' }),
      }),
    ),
  )
  act(() => notify.mock.calls.at(-1)![0].action!.run())

  expect(
    await screen.findByRole('group', { name: 'AI proposal' }),
  ).toBeInTheDocument()
  expect(asked).toHaveLength(2)
  expect(asked[1]).toEqual(asked[0])
  expect(asked[1].ctx).toEqual({
    document: text,
    selection: text,
    toolName: 'edit',
  })
})
