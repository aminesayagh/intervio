import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  authRoutes,
  HomePage,
  useCurrentUser,
  type Access,
} from '../services/auth'
import { navigate, usePath } from '../services/navigation'
import { PublicLayout } from '../services/ui-kit'

const queryClient = new QueryClient()

const routes = {
  ...authRoutes,
  '/': { page: HomePage, access: 'user' as Access },
}

function Router() {
  const path = usePath()
  const { data: user, isPending } = useCurrentUser()
  const route = routes[path as keyof typeof routes]
  const redirect = isPending
    ? null
    : !route
      ? '/'
      : route.access === 'user' && !user
        ? path === '/reset-password'
          ? '/link-invalid'
          : '/login'
        : route.access === 'guest' && user
          ? '/'
          : null

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
