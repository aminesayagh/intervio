import { Button, Form } from '@heroui/react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, navigate } from '../../navigation'
import { Field, FormError, Title, check } from '../../ui-kit'
import { authApi, errorKey } from '../api'
import { checkEmailUrl } from '../routes'

/** Sign up with a sign-in link: no password; the name is needed to create the account. */
export function SignUpLinkPage() {
  const { t } = useTranslation('auth')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await authApi.signUpWithLink(fullName, email)
      navigate(checkEmailUrl('signin', email))
    } catch (e) {
      setError(errorKey(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Title>{t('linkSignup.title')}</Title>
      <FormError message={error && t(error)} />
      <p className="mb-4">{t('linkSignup.intro')}</p>
      <Form onSubmit={send} className="flex flex-col gap-3">
        <Field
          name="fullName"
          autoComplete="name"
          label={t('signup.fullName')}
          placeholder={t('placeholders.fullName')}
          value={fullName}
          onChange={setFullName}
          check={check.required}
        />
        <Field
          name="email"
          type="email"
          autoComplete="email"
          label={t('signup.workEmail')}
          placeholder={t('placeholders.email')}
          value={email}
          onChange={setEmail}
          check={check.email}
        />
        <Button type="submit" fullWidth isPending={pending} className="mt-1">
          {t('linkSignup.submit')}
        </Button>
      </Form>
      <div className="mt-4 flex flex-col items-center gap-4 text-center">
        <p className="text-xs text-muted">
          {t('signup.termsStart')}{' '}
          <a href="/terms" className="underline underline-offset-4">
            {t('signup.terms')}
          </a>{' '}
          {t('signup.termsMiddle')}{' '}
          <a href="/privacy" className="underline underline-offset-4">
            {t('signup.privacy')}
          </a>
          .
        </p>
        <p>
          {t('signup.haveAccount')}{' '}
          <Link href="/login">{t('signup.logIn')}</Link>
        </p>
      </div>
    </>
  )
}
