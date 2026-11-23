import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { clearNotifications, Notifications } from '../../notifications'
import { Confirmations } from '../confirm/Confirmations'

/**
 * Renders a component at an address (spec 15.2): a fresh query cache with retries off,
 * and empty storage, so every test starts from the same place.
 */
export function renderAt(
  url: string,
  ui: ReactElement,
  /** What the tab held before, as after a refresh. */
  session: Record<string, string> = {},
) {
  window.history.replaceState(null, '', url)
  clearNotifications()
  try {
    sessionStorage.clear()
    localStorage.clear()
    for (const [key, value] of Object.entries(session))
      sessionStorage.setItem(key, value)
  } catch {
    // storage blocked: nothing to clear
  }
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        {ui}
        <Notifications />
        <Confirmations />
      </QueryClientProvider>,
    ),
  }
}
