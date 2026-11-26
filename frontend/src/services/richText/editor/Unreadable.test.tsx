import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import '../../i18n'
import { TestEditor } from '../testing/TestEditor'

// Plate's Markdown reader accepts any text met so far, so its failure is simulated.
vi.mock('./markdown', async (original) => ({
  ...(await original<typeof import('./markdown')>()),
  parseMarkdown: () => ({ ok: false, error: new Error('unreadable') }),
}))

afterEach(cleanup)

test('a text the editor cannot read is shown as it is, read-only, reported once, and never changed', async () => {
  const onFailure = vi.fn()
  const onChange = vi.fn()
  render(
    <TestEditor
      value={'## Odd **text**'}
      onChange={onChange}
      onFailure={onFailure}
    />,
  )
  expect(screen.getByText('## Odd **text**')).toBeInTheDocument()
  expect(screen.queryByRole('textbox')).toBeNull()
  await new Promise((done) => setTimeout(done, 300))
  expect(onFailure).toHaveBeenCalledTimes(1)
  expect(onFailure).toHaveBeenCalledWith('parse')
  expect(onChange).not.toHaveBeenCalled()
})
