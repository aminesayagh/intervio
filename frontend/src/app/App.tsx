import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import { authRoutes, useCurrentUser, type Access } from '../services/auth'
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
import { navigate, usePath } from '../services/navigation'
import { Notifications } from '../services/notifications'
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
 * Loaded through import() inside the DEV check, so production builds leave it out.
 */
const devRoutes: Record<string, Route> = import.meta.env.DEV
  ? {
      '/dev/collection': {
        page: lazy(
          () => import('../services/collection/showcase/CollectionShowcase'),
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

  let redirect: string | null = null
  if (!isPending) {
    // "/" and unknown addresses: the dashboard when logged in, else log in (decision 82).
    if (!route) redirect = user ? CLIENT_BOARD_HOME : '/login'
    else if (route.access === 'user' && !user)
      redirect = path === '/reset-password' ? '/link-invalid' : '/login'
    else if (route.access === 'guest' && user) redirect = CLIENT_BOARD_HOME
    // A client without a company goes through onboarding first (decision 58).
    else if (user && company === null && !BEFORE_ONBOARDING.includes(path))
      redirect = ONBOARDING_START
  }

  useEffect(() => {
    if (redirect) navigate(redirect, { replace: true })
  }, [redirect])

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
      <Router />
      <Notifications />
    </QueryClientProvider>
  )
}
