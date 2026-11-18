import { Alert, Button } from '@heroui/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../navigation'
import { Icon } from '../../ui-kit'

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="mb-5 text-2xl leading-tight">{children}</h1>
}

/** Full-page navigation: Google sign-in leaves the app and comes back. */
export function GoogleButton() {
  const { t } = useTranslation('auth')
  return (
    <Button
      variant="secondary"
      fullWidth
      onPress={() => window.location.assign('/oauth2/authorization/google')}
    >
      <img src="/icons/google.svg" alt="" width={16} height={16} />
      {t('common.google')}
    </Button>
  )
}

/** Opens the screen that sends a sign-in link (same style as the Google button). */
export function LinkButton({ href }: { href: string }) {
  const { t } = useTranslation('auth')
  return (
    <Button variant="secondary" fullWidth onPress={() => navigate(href)}>
      <Icon name="Message-5" />
      {t('common.linkInstead')}
    </Button>
  )
}

export function OrDivider() {
  const { t } = useTranslation('auth')
  return (
    <div className="my-4 flex items-center gap-3 text-sm text-muted">
      <span className="h-px flex-1 bg-separator" />
      {t('common.or')}
      <span className="h-px flex-1 bg-separator" />
    </div>
  )
}

/** Message about the whole form, shown above it. */
export function FormError({ messageKey }: { messageKey: string | null }) {
  const { t } = useTranslation('auth')
  if (!messageKey) return null
  return (
    <Alert status="danger" className="mb-4">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{t(messageKey)}</Alert.Description>
      </Alert.Content>
    </Alert>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <Alert status="success" className="mb-4">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  )
}
