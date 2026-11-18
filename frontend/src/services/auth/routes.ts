import type { ComponentType } from 'react'
import { CheckEmailPage } from './pages/CheckEmailPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LinkInvalidPage } from './pages/LinkInvalidPage'
import { LoginPage } from './pages/LoginPage'
import { NewPasswordPage } from './pages/NewPasswordPage'
import { OpenLinkPage } from './pages/OpenLinkPage'
import { ResetLinkSentPage } from './pages/ResetLinkSentPage'
import { SignupPage } from './pages/SignupPage'

/** guest: only when logged out · user: only when logged in · any: both. */
export type Access = 'guest' | 'user' | 'any'

export const authRoutes: Record<
  string,
  { page: ComponentType; access: Access }
> = {
  '/login': { page: LoginPage, access: 'guest' },
  '/signup': { page: SignupPage, access: 'guest' },
  '/check-email': { page: CheckEmailPage, access: 'guest' },
  '/forgot-password': { page: ForgotPasswordPage, access: 'guest' },
  '/reset-link-sent': { page: ResetLinkSentPage, access: 'guest' },
  '/reset-password': { page: NewPasswordPage, access: 'user' },
  '/link-invalid': { page: LinkInvalidPage, access: 'any' },
  '/auth/link': { page: OpenLinkPage, access: 'any' },
}

export function checkEmailUrl(kind: 'confirm' | 'signin', email: string) {
  return `/check-email?${new URLSearchParams({ kind, email })}`
}
