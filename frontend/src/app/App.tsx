import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ComponentType } from 'react'
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
import { navigate, usePath } from '../services/navigation'
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
    Object.entries({ ...clientBoardRoutes, ...settingsRoutes }).map(
      ([path, page]) => [path, { page, access: 'user', board: true }],
    ),
  ),
}

/** Every company tab shares one page, which reads the company id from the address. */
const companySettingsRoute: Route = {
  page: CompanySettingsPage,
  access: 'user',
  board: true,
}

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
  const route = path.startsWith(COMPANY_SETTINGS_PREFIX)
    ? companySettingsRoute
    : routes[path]
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
      <Page />
    </Layout>
  )
}

export function App() {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  )
}
