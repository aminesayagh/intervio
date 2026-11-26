import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../http'
import { i18n } from '../i18n'
import { navigate } from '../navigation'

export type CurrentUser = {
  fullName: string
  email: string
  /** The new email, until its confirmation link is opened. */
  pendingEmail: string | null
  /** The uploaded photo, else the Google account photo, else null. */
  photoUrl: string | null
  hasPassword: boolean
  googleConnected: boolean
}

const locale = () => i18n.language

export const authApi = {
  logIn: (email: string, password: string, rememberMe: boolean) =>
    api('/api/auth/login', {
      body: {
        form: {
          email,
          password,
          ...(rememberMe ? { rememberMe: 'true' } : {}),
        },
      },
    }),
  signUp: (fullName: string, email: string, password: string) =>
    api('/api/auth/signup', {
      body: { json: { fullName, email, password, locale: locale() } },
    }),
  signUpWithLink: (fullName: string, email: string) =>
    api('/api/auth/signup/link', {
      body: { json: { fullName, email, locale: locale() } },
    }),
  sendSignInLink: (email: string) =>
    api('/api/auth/link', { body: { json: { email } } }),
  resendConfirmation: (email: string) =>
    api('/api/auth/confirmation', { body: { json: { email } } }),
  forgotPassword: (email: string) =>
    api('/api/auth/password/forgot', { body: { json: { email } } }),
  openLink: (token: string) =>
    api<{ next: 'home' | 'reset-password' | 'profile' }>('/api/auth/token', {
      body: { json: { token } },
    }),
  setPassword: (password: string) =>
    api('/api/auth/password', { body: { json: { password } } }),
  logOut: () => api('/api/auth/logout', { method: 'POST' }),
}

/**
 * Whether "Continue with Google" can work (MAS-38): the backend says whether Google
 * sign-in is configured. Off until it answers, and when it can't.
 */
export function useGoogleSignIn() {
  const { data } = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: () => api<{ google: boolean }>('/api/auth/providers'),
    staleTime: Infinity,
  })
  return data?.google ?? false
}

export const currentUserKey = ['auth', 'me']

/** The logged-in user, or null when nobody is logged in. */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: async () => {
      try {
        return await api<CurrentUser>('/api/auth/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    staleTime: Infinity,
    retry: false, // if the backend cannot be reached, show the public screens at once
  })
}

/** Logs out, forgets every cached user data, and opens log in. */
export function useLogOut() {
  const queryClient = useQueryClient()
  return async () => {
    await authApi.logOut()
    queryClient.clear()
    navigate('/login', { replace: true })
  }
}

/** Translation key of the message for any error. */
export function errorKey(error: unknown) {
  return `errors.${error instanceof ApiError ? error.code : 'ERROR_UNKNOWN'}`
}
