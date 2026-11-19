import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate, useSearchParams } from '../../navigation'
import { authApi, currentUserKey } from '../api'

/**
 * Target of every email link. The token is sent by POST from the page, so email scanners
 * that only open links cannot use up a single-use link.
 */
export function OpenLinkPage() {
  const { t } = useTranslation('auth')
  const queryClient = useQueryClient()
  const token = useSearchParams().get('token') ?? ''
  const opened = useRef(false)

  useEffect(() => {
    if (opened.current) return // a link works once; React may run effects twice in development
    opened.current = true
    authApi
      .openLink(token)
      .then(async ({ next }) => {
        await queryClient.invalidateQueries({ queryKey: currentUserKey })
        const to = {
          'reset-password': '/reset-password',
          profile: '/settings/profile',
          home: '/',
        }
        navigate(to[next], { replace: true })
      })
      .catch(() => navigate('/link-invalid', { replace: true }))
  }, [token, queryClient])

  return <p>{t('linkOpening')}</p>
}
