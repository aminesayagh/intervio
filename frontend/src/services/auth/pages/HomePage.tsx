import { Button } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../navigation'
import { authApi, useCurrentUser } from '../api'

// ponytail: placeholder landing page until onboarding and the client board exist.
export function HomePage() {
  const { t } = useTranslation('auth')
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()

  async function logOut() {
    await authApi.logOut()
    queryClient.clear() // no user data survives a log-out
    navigate('/login', { replace: true })
  }

  return (
    <>
      <p className="mb-4">{t('home.loggedIn', { name: user?.fullName })}</p>
      <Button variant="secondary" onPress={logOut}>
        {t('home.logOut')}
      </Button>
    </>
  )
}
