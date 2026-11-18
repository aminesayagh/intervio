import { Button, Form } from '@heroui/react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, navigate } from '../../navigation'
import { authApi, errorKey } from '../api'
import { Field } from '../components/Field'
import {
  FormError,
  GoogleButton,
  LinkButton,
  OrDivider,
  Title,
} from '../components/Parts'
import { checkEmailUrl } from '../routes'
import * as check from '../validation'

/** Screen 2: sign up. */
export function SignupPage() {
  const { t } = useTranslation('auth')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
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

  return (
    <>
      <Title>{t('signup.title')}</Title>
      <FormError messageKey={error} />
      <div className="flex flex-col gap-2">
        <GoogleButton />
        <LinkButton href="/signup/link" />
      </div>
      <OrDivider />
      <Form onSubmit={signUp} className="flex flex-col gap-3">
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
        <Field
          name="password"
          type="password"
          autoComplete="new-password"
          label={t('signup.password')}
          placeholder={t('placeholders.password')}
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
          placeholder={t('placeholders.password')}
          value={confirm}
          onChange={setConfirm}
          check={check.confirmation(password)}
        />
        <Button type="submit" fullWidth isPending={pending} className="mt-1">
          {t('signup.submit')}
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
