import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import {
  authRoutes,
  dropReturnTo,
  peekReturnTo,
  saveReturnTo,
  useCurrentUser,
  type Access,
} from '../services/auth'
import {
  CLIENT_BOARD_HOME,
  ClientBoardLayout,
  clientBoardRoutes,
} from '../services/core/client-board'
import {
  ONBOARDING_START,
  onboardingRoutes,
  useCompany,
} from '../services/core/companies'
import {
  COMPANY_SETTINGS_PREFIX,
  CompanySettingsPage,
  settingsRoutes,
} from '../services/core/settings'
import {
  INTERVENTION_PREFIX,
  interventionRoutes,
  InterventionPage,
} from '../services/core/interventions'
import { navigate, QueryProvider, usePath } from '../services/navigation'
import { Notifications } from '../services/notifications'
// The host alone: importing the collection's index would load it with the app shell.
import { Confirmations } from '../services/collection/confirm/Confirmations'
import { PublicLayout } from '../services/ui-kit'

type Route = { page: ComponentType; access: Access; board?: boolean }

const routes: Record<string, Route> = {
  ...authRoutes,
  ...Object.fromEntries(
    Object.entries(onboardingRoutes).map(([path, page]) => [
      path,
      { page, access: 'user' },
    ]),
  ),
  ...Object.fromEntries(
    Object.entries({
      ...clientBoardRoutes,
      ...settingsRoutes,
      ...interventionRoutes,
    }).map(([path, page]) => [path, { page, access: 'user', board: true }]),
  ),
}

/**
 * Development only: the collection wrapper's showcase (collection-archetype-spec.md 17.1).
 * Loaded through import() inside the check, so production builds leave it out, except
 * one built with VITE_SHOWCASE=1 to measure performance in production mode.
 */
const devRoutes: Record<string, Route> =
  import.meta.env.DEV || import.meta.env.VITE_SHOWCASE === '1'
    ? {
        '/dev/collection': {
          page: lazy(
            () => import('../services/collection/showcase/CollectionShowcase'),
          ),
          access: 'user',
          board: true,
        },
        '/dev/parts': {
          page: lazy(() =>
            import('../services/collection/showcase/CollectionShowcase').then(
              (module) => ({ default: module.PartsShowcase }),
            ),
          ),
          access: 'user',
          board: true,
        },
      }
    : {}

/** Addresses with an id: one page each, which reads the id from the address. */
const prefixRoutes: [string, Route][] = [
  // Development only: a test record's full page in the showcase.
  ...Object.entries(devRoutes).map(([path, route]): [string, Route] => [
    `${path}/`,
    route,
  ]),
  [
    COMPANY_SETTINGS_PREFIX,
    { page: CompanySettingsPage, access: 'user', board: true },
  ],
  [
    INTERVENTION_PREFIX,
    { page: InterventionPage, access: 'user', board: true },
  ],
]

/** Pages a logged-in user may open before onboarding is done. */
const BEFORE_ONBOARDING = [
  '/reset-password',
  '/link-invalid',
  '/auth/link',
  ONBOARDING_START,
]

function Router() {
  const path = usePath()
  const { data: user, isPending: userPending } = useCurrentUser()
  const { data: company, isPending: companyPending } = useCompany(!!user)
  const route =
    routes[path] ??
    devRoutes[path] ??
    prefixRoutes.find(([prefix]) => path.startsWith(prefix))?.[1]
  const isPending = userPending || (!!user && companyPending)

  // After logging in, the page asked for before, else the dashboard (decision 140).
  const home = () => peekReturnTo() ?? CLIENT_BOARD_HOME
  let redirect: string | null = null
  let keepAddress = false
  if (!isPending) {
    // "/" and unknown addresses: the dashboard when logged in, else log in (decision 82).
    if (!route) redirect = user ? home() : '/login'
    else if (route.access === 'user' && !user) {
      keepAddress = path !== '/reset-password'
      redirect = keepAddress ? '/login' : '/link-invalid'
    } else if (route.access === 'guest' && user) redirect = home()
    // A client without a company goes through onboarding first (decision 58).
    else if (user && company === null && !BEFORE_ONBOARDING.includes(path))
      redirect = ONBOARDING_START
  }

  useEffect(() => {
    if (keepAddress)
      saveReturnTo(window.location.pathname + window.location.search)
    if (redirect) navigate(redirect, { replace: true })
    // A logged-in user has arrived: the saved page works once, so it is dropped.
    else if (user) dropReturnTo()
  }, [redirect, keepAddress, user])

  if (isPending || redirect) return null
  const Page = route.page
  const Layout = route.board ? ClientBoardLayout : PublicLayout
  return (
    <Layout>
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    </Layout>
  )
}

export function App() {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <QueryProvider>
        <Router />
        <Notifications />
        <Confirmations />
      </QueryProvider>
    </QueryClientProvider>
  )
}
