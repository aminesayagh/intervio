import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import '../../i18n'
import { GoogleButton } from './Parts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderWith(google: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ google })),
  )
  render(
    <QueryClientProvider client={new QueryClient()}>
      <GoogleButton />
    </QueryClientProvider>,
  )
}

test('"Continue with Google" shows when Google sign-in is configured', async () => {
  renderWith(true)
  expect(
    await screen.findByRole('button', { name: /google/i }),
  ).toBeInTheDocument()
})

test('no Google button when Google sign-in is not configured (MAS-38)', async () => {
  renderWith(false)
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
