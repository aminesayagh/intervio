import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../http'
import { i18n } from '../i18n'

export type CurrentUser = { fullName: string; email: string }

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
    api<{ next: 'home' | 'reset-password' }>('/api/auth/token', {
      body: { json: { token } },
    }),
  setPassword: (password: string) =>
    api('/api/auth/password', { body: { json: { password } } }),
  logOut: () => api('/api/auth/logout', { method: 'POST' }),
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

/** Translation key of the message for any error. */
export function errorKey(error: unknown) {
  return `errors.${error instanceof ApiError ? error.code : 'ERROR_UNKNOWN'}`
}
