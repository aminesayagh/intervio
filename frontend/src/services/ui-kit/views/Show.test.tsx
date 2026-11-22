import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { cn } from '../cn'
import { Match, Show, Switch, Variant } from './Show'

afterEach(cleanup)

test('Show shows its children when the condition holds, else the fallback', async () => {
  const { rerender } = render(
    <Show when={null as string | null} fallback={<p>None</p>}>
      {(message) => <p>Error: {message}</p>}
    </Show>,
  )
  expect(screen.getByText('None')).toBeInTheDocument()
  rerender(
    <Show when={'refused' as string | null} fallback={<p>None</p>}>
      {(message) => <p>Error: {message}</p>}
    </Show>,
  )
  // The new content comes in once the old one has left.
  expect(await screen.findByText('Error: refused')).toBeInTheDocument()
})

test('Switch shows the first case that holds, or the fallback', async () => {
  const view = (state: string) => (
    <Switch fallback={<p>Shown</p>}>
      <Match when={state === 'loading'}>
        <p>Loading</p>
      </Match>
      <Match when={state === 'failed'}>
        <p>Failed</p>
      </Match>
    </Switch>
  )
  const { rerender } = render(view('loading'))
  expect(screen.getByText('Loading')).toBeInTheDocument()
  rerender(view('failed'))
  expect(await screen.findByText('Failed')).toBeInTheDocument()
  rerender(view('done'))
  expect(await screen.findByText('Shown')).toBeInTheDocument()
})

test('Variant shows the view for the current option, or the fallback', async () => {
  const view = (kind: 'edit' | 'read' | 'none') => (
    <Variant
      value={kind}
      views={{ edit: () => <p>Field</p>, read: () => <p>Text</p> }}
      fallback={<p>Nothing</p>}
    />
  )
  const { rerender } = render(view('edit'))
  expect(screen.getByText('Field')).toBeInTheDocument()
  rerender(view('read'))
  expect(await screen.findByText('Text')).toBeInTheDocument()
  expect(screen.queryByText('Field')).not.toBeInTheDocument()
  rerender(view('none'))
  expect(await screen.findByText('Nothing')).toBeInTheDocument()
})

test('cn joins conditions and lets the later Tailwind class win', () => {
  const hidden = false
  expect(cn('px-3 text-sm', hidden && 'hidden', 'px-1')).toBe('text-sm px-1')
})
