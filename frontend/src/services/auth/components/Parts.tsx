import { Button } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../navigation'
import { Icon, Show } from '../../ui-kit'
import { useGoogleSignIn } from '../api'

/**
 * Full-page navigation: Google sign-in leaves the app and comes back. Shown only
 * when Google sign-in is configured (MAS-38).
 */
export function GoogleButton() {
  const { t } = useTranslation('auth')
  return (
    <Show when={useGoogleSignIn()}>
      <Button
        variant="secondary"
        fullWidth
        onPress={() => window.location.assign('/oauth2/authorization/google')}
      >
        <img src="/icons/google.svg" alt="" width={16} height={16} />
        {t('common.google')}
      </Button>
    </Show>
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
