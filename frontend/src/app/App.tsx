import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, type ComponentType } from 'react'
import {
  authRoutes,
  HomePage,
  useCurrentUser,
  type Access,
} from '../services/auth'
import {
  ONBOARDING_START,
  onboardingRoutes,
  useCompany,
} from '../services/core/companies'
import { navigate, usePath } from '../services/navigation'
import { PublicLayout } from '../services/ui-kit'

const queryClient = new QueryClient()

const routes: Record<string, { page: ComponentType; access: Access }> = {
  ...authRoutes,
  ...Object.fromEntries(
    Object.entries(onboardingRoutes).map(([path, page]) => [
      path,
      { page, access: 'user' },
    ]),
  ),
  '/': { page: HomePage, access: 'user' },
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
  const route = routes[path]
  const isPending = userPending || (!!user && companyPending)

  let redirect: string | null = null
  if (!isPending) {
    if (!route) redirect = '/'
    else if (route.access === 'user' && !user)
      redirect = path === '/reset-password' ? '/link-invalid' : '/login'
    else if (route.access === 'guest' && user) redirect = '/'
    // A client without a company goes through onboarding first (decision 58).
    else if (user && company === null && !BEFORE_ONBOARDING.includes(path))
      redirect = ONBOARDING_START
  }

  useEffect(() => {
    if (redirect) navigate(redirect, { replace: true })
  }, [redirect])

  if (isPending || redirect) return null
  const Page = route.page
  return (
    <PublicLayout>
      <Page />
    </PublicLayout>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  )
}
