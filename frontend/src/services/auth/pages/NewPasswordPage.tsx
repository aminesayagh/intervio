import { Button, Form } from '@heroui/react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../http'
import { navigate } from '../../navigation'
import { Field, FormError, Title, check } from '../../ui-kit'
import { authApi, errorKey } from '../api'

/** Screen 7: set a new password, reached from a reset link. Saving keeps the user logged in. */
export function NewPasswordPage() {
  const { t } = useTranslation('auth')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await authApi.setPassword(password)
      navigate('/', { replace: true })
    } catch (e) {
      // Without a valid reset link behind this page, the link is the problem.
      if (
        e instanceof ApiError &&
        (e.status === 401 || e.code === 'ERROR_RESET_NOT_ALLOWED')
      ) {
        navigate('/link-invalid', { replace: true })
      } else {
        setError(errorKey(e))
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Title>{t('newPassword.title')}</Title>
      <FormError message={error && t(error)} />
      <Form onSubmit={save} className="flex flex-col gap-3">
        <Field
          name="password"
          type="password"
          autoComplete="new-password"
          label={t('newPassword.password')}
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
          label={t('newPassword.confirm')}
          placeholder={t('placeholders.password')}
          value={confirm}
          onChange={setConfirm}
          check={check.confirmation(password)}
        />
        <Button type="submit" fullWidth isPending={pending} className="mt-1">
          {t('newPassword.submit')}
        </Button>
      </Form>
    </>
  )
}
