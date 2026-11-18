import { Alert, Button } from '@heroui/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

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
      {t('common.google')}
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
