import { NuqsAdapter, enableHistorySync } from 'nuqs/adapters/react'
import type { ReactNode } from 'react'

// navigate() pushes entries itself (they carry state nuqs can't set): nuqs's hooks
// follow those too.
enableHistorySync()

/**
 * The address's query string as state (nuqs): typed parsers, defaults left out of
 * the address, changes batched into one update. Mounted once at the app's root.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  return <NuqsAdapter>{children}</NuqsAdapter>
}
