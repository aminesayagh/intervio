import { useQueryClient } from '@tanstack/react-query'
import { currentUserKey, type CurrentUser } from '../../auth'
import { api, ApiError } from '../../http'

export const profileApi = {
  rename: (fullName: string) =>
    api<CurrentUser>('/api/profile', {
      method: 'PUT',
      body: { json: { fullName } },
    }),
  /** Uses an uploaded file (purpose userPhoto) as the photo; the previous one is deleted. */
  setPhoto: (fileId: string) =>
    api<CurrentUser>('/api/profile/photo', {
      method: 'PUT',
      body: { json: { fileId } },
    }),
  removePhoto: () =>
    api<CurrentUser>('/api/profile/photo', { method: 'DELETE' }),
  /** Sends the confirmation link to the new email; also resends it. */
  changeEmail: (email: string) =>
    api<CurrentUser>('/api/profile/email', {
      method: 'POST',
      body: { json: { email } },
    }),
  cancelEmailChange: () =>
    api<CurrentUser>('/api/profile/email', { method: 'DELETE' }),
  /** currentPassword is null when the user has no password yet. */
  changePassword: (currentPassword: string | null, newPassword: string) =>
    api('/api/profile/password', {
      method: 'PUT',
      body: { json: { currentPassword, newPassword } },
    }),
  endOtherSessions: () => api('/api/profile/sessions/end', { method: 'POST' }),
  deleteAccount: (email: string) =>
    api('/api/account', { method: 'DELETE', body: { json: { email } } }),
}

/** Puts the user returned by a profile call in the cache, so the sidebar updates too. */
export function useSaveUser() {
  const queryClient = useQueryClient()
  return (user: CurrentUser) => queryClient.setQueryData(currentUserKey, user)
}

/** Translation key (settings namespace) of the message for any error. */
export function errorKey(error: unknown) {
  return `errors.${error instanceof ApiError ? error.code : 'ERROR_UNKNOWN'}`
}
