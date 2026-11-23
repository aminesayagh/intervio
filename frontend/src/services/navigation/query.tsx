import { NuqsAdapter } from 'nuqs/adapters/react-router/v8'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { RouterProvider } from 'react-router/dom'
import { createRouter } from './router'

/**
 * The address's query string as state (nuqs): typed parsers, defaults left out of
 * the address, changes batched into one update. Mounted once, inside the router.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  return <NuqsAdapter>{children}</NuqsAdapter>
}

const Children = createContext<ReactNode>(null)
const Slot = () => <QueryProvider>{useContext(Children)}</QueryProvider>

/** A router with one page, its children, at every address: for tests. */
export function AddressProvider({ children }: { children: ReactNode }) {
  const [router] = useState(() =>
    createRouter([{ path: '*', element: <Slot /> }]),
  )
  return (
    <Children value={children}>
      <RouterProvider router={router} />
    </Children>
  )
}
