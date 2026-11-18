import { Button, Form } from '@heroui/react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, navigate } from '../../navigation'
import { authApi, errorKey } from '../api'
import { Field } from '../components/Field'
import { FormError, GoogleButton, OrDivider, Title } from '../components/Parts'
import { checkEmailUrl } from '../routes'
import * as check from '../validation'

/** Screen 2: sign up. */
export function SignupPage() {
  const { t } = useTranslation('auth')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [linkErrors, setLinkErrors] = useState<{
    fullName?: string | null
    email?: string | null
  }>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function run(action: () => Promise<void>) {
    setError(null)
    setPending(true)
    try {
      await action()
    } catch (e) {
      setError(errorKey(e))
    } finally {
      setPending(false)
    }
  }

  function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run(async () => {
      await authApi.signUp(fullName, email, password)
      navigate(checkEmailUrl('confirm', email))
    })
  }

  /** Sign-up without a password: only the name and email are needed. */
  function signUpWithLink() {
    const errors = {
      fullName: check.required(fullName),
      email: check.email(email),
    }
    setLinkErrors(errors)
    if (errors.fullName || errors.email) return
    void run(async () => {
      await authApi.signUpWithLink(fullName, email)
      navigate(checkEmailUrl('signin', email))
    })
  }

  return (
    <>
      <Title>{t('signup.title')}</Title>
      <FormError messageKey={error} />
      <GoogleButton />
      <OrDivider />
      <Form onSubmit={signUp} className="flex flex-col gap-4">
        <Field
          name="fullName"
          autoComplete="name"
          label={t('signup.fullName')}
          value={fullName}
          onChange={(v) => {
            setFullName(v)
            setLinkErrors((e) => ({ ...e, fullName: null }))
          }}
          check={check.required}
          error={linkErrors.fullName}
        />
        <Field
          name="email"
          type="email"
          autoComplete="email"
          label={t('signup.workEmail')}
          value={email}
          onChange={(v) => {
            setEmail(v)
            setLinkErrors((e) => ({ ...e, email: null }))
          }}
          check={check.email}
          error={linkErrors.email}
        />
        <Field
          name="password"
          type="password"
          autoComplete="new-password"
          label={t('signup.password')}
          help={t('signup.passwordHelp')}
          value={password}
          onChange={setPassword}
          check={check.newPassword}
        />
        <Field
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          label={t('signup.confirmPassword')}
          value={confirm}
          onChange={setConfirm}
          check={check.confirmation(password)}
        />
        <Button type="submit" fullWidth isPending={pending} className="mt-2">
          {t('signup.submit')}
        </Button>
      </Form>
      <div className="mt-6 flex flex-col items-center gap-6 text-center">
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={signUpWithLink}
        >
          {t('common.linkInstead')}
        </button>
        <p className="text-sm text-muted">
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
