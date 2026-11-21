import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'

/**
 * Renders a component at an address (spec 15.2): a fresh query cache with retries off,
 * and empty storage, so every test starts from the same place.
 */
export function renderAt(url: string, ui: ReactElement) {
  window.history.replaceState(null, '', url)
  try {
    sessionStorage.clear()
    localStorage.clear()
  } catch {
    // storage blocked: nothing to clear
  }
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    client,
    ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>),
  }
}
