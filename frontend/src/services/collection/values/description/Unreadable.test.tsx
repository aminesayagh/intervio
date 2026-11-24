import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import '../../../i18n'
import * as notifications from '../../../notifications'
import { Description } from '../Description'

// Plate's Markdown reader accepts any text met so far, so its failure is simulated.
vi.mock('./plugins', async (original) => ({
  ...(await original<typeof import('./plugins')>()),
  parseMarkdown: () => ({ ok: false, error: new Error('unreadable') }),
}))

afterEach(cleanup)

test('a text the editor cannot read is shown as it is, read-only, said once, and never saved', async () => {
  const notify = vi.spyOn(notifications, 'notify')
  const save = vi.fn(async () => {})
  render(
    <Description
      value={'## Odd **text**'}
      editable
      storageKey="unreadable"
      scope="test:record:1"
      save={save}
    />,
  )
  expect(screen.getByText('## Odd **text**')).toBeInTheDocument()
  expect(screen.queryByRole('textbox')).toBeNull()
  await new Promise((done) => setTimeout(done, 1200))
  expect(notify).toHaveBeenCalledTimes(1)
  expect(notify).toHaveBeenCalledWith(
    expect.objectContaining({ tone: 'error', scope: 'test:record:1' }),
  )
  expect(save).not.toHaveBeenCalled()
})
