import { Button, Checkbox, Form } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, navigate, useSearchParams } from '../../navigation'
import { authApi, currentUserKey, errorKey } from '../api'
import { Field } from '../components/Field'
import { FormError, GoogleButton, OrDivider, Title } from '../components/Parts'
import { checkEmailUrl } from '../routes'
import * as check from '../validation'

/** Screen 1: log in. */
export function LoginPage() {
  const { t } = useTranslation('auth')
  const queryClient = useQueryClient()
  const googleFailed = useSearchParams().get('error') === 'google'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(
    googleFailed ? 'errors.ERROR_GOOGLE_FAILED' : null,
  )
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

  function logIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run(async () => {
      await authApi.logIn(email, password, rememberMe)
      await queryClient.invalidateQueries({ queryKey: currentUserKey })
      navigate('/')
    })
  }

  function sendLink() {
    const invalid = check.email(email)
    setEmailError(invalid)
    if (invalid) return
    void run(async () => {
      await authApi.sendSignInLink(email)
      navigate(checkEmailUrl('signin', email))
    })
  }

  return (
    <>
      <Title>{t('login.title')}</Title>
      <FormError messageKey={error} />
      <GoogleButton />
      <OrDivider />
      <Form onSubmit={logIn} className="flex flex-col gap-4">
        <Field
          name="email"
          type="email"
          autoComplete="email"
          label={t('login.email')}
          value={email}
          onChange={(v) => {
            setEmail(v)
            setEmailError(null)
          }}
          check={check.email}
          error={emailError}
        />
        <Field
          name="password"
          type="password"
          autoComplete="current-password"
          label={t('login.password')}
          value={password}
          onChange={setPassword}
          check={check.required}
        />
        <div className="flex items-center justify-between">
          <Checkbox isSelected={rememberMe} onChange={setRememberMe}>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {t('login.rememberMe')}
            </Checkbox.Content>
          </Checkbox>
          <Link href="/forgot-password">{t('login.forgot')}</Link>
        </div>
        <Button type="submit" fullWidth isPending={pending} className="mt-2">
          {t('login.submit')}
        </Button>
      </Form>
      <div className="mt-6 flex flex-col items-center gap-8">
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={sendLink}
        >
          {t('common.linkInstead')}
        </button>
        <p>
          {t('login.noAccount')} <Link href="/signup">{t('login.signUp')}</Link>
        </p>
      </div>
    </>
  )
}
