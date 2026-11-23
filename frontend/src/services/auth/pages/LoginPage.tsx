import { Button, Checkbox, Form } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, navigate, useQueryState } from '../../navigation'
import { Field, FormError, Title, check } from '../../ui-kit'
import { authApi, currentUserKey, errorKey } from '../api'
import { GoogleButton, LinkButton, OrDivider } from '../components/Parts'

/** Screen 1: log in. */
export function LoginPage() {
  const { t } = useTranslation('auth')
  const queryClient = useQueryClient()
  const googleFailed = useQueryState('error')[0] === 'google'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
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

  return (
    <>
      <Title>{t('login.title')}</Title>
      <FormError message={error && t(error)} />
      <div className="flex flex-col gap-2">
        <GoogleButton />
        <LinkButton href="/login/link" />
      </div>
      <OrDivider />
      <Form onSubmit={logIn} className="flex flex-col gap-3">
        <Field
          name="email"
          type="email"
          autoComplete="email"
          label={t('login.email')}
          placeholder={t('placeholders.email')}
          value={email}
          onChange={setEmail}
          check={check.email}
        />
        <Field
          name="password"
          type="password"
          autoComplete="current-password"
          label={t('login.password')}
          placeholder={t('placeholders.password')}
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
        <Button type="submit" fullWidth isPending={pending} className="mt-1">
          {t('login.submit')}
        </Button>
      </Form>
      <div className="mt-4 flex flex-col items-center gap-5">
        <p>
          {t('login.noAccount')} <Link href="/signup">{t('login.signUp')}</Link>
        </p>
      </div>
    </>
  )
}
