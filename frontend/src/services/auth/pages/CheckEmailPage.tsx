import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from '../../navigation'
import { FormError, Notice, Title } from '../../ui-kit'
import { authApi, errorKey } from '../api'

/** Screen 3: check your email, after a sign-up or a sign-in link request. */
export function CheckEmailPage() {
  const { t } = useTranslation('auth')
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const kind = params.get('kind')
  const [resent, setResent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resend() {
    setError(null)
    setResent(false)
    try {
      await (kind === 'confirm'
        ? authApi.resendConfirmation(email)
        : authApi.sendSignInLink(email))
      setResent(true)
    } catch (e) {
      setError(errorKey(e))
    }
  }

  return (
    <>
      <Title>{t('checkEmail.title')}</Title>
      <FormError message={error && t(error)} />
      {resent && <Notice>{t('checkEmail.resent')}</Notice>}
      <p className="mb-5">{t('checkEmail.sent', { email })}</p>
      <div className="flex flex-col items-start gap-3">
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={resend}
        >
          {t('checkEmail.resend')}
        </button>
        <Link href="/login">{t('checkEmail.another')}</Link>
      </div>
    </>
  )
}
