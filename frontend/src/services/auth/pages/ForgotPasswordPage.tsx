import { Button, Form } from '@heroui/react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, navigate } from '../../navigation'
import { Field, FormError, Title, check } from '../../ui-kit'
import { authApi, errorKey } from '../api'

/** Screen 5: forgot password. */
export function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await authApi.forgotPassword(email)
      navigate('/reset-link-sent')
    } catch (e) {
      setError(errorKey(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Title>{t('forgot.title')}</Title>
      <FormError message={error && t(error)} />
      <p className="mb-4">{t('forgot.intro')}</p>
      <Form onSubmit={send} className="flex flex-col gap-4">
        <Field
          name="email"
          type="email"
          autoComplete="email"
          label={t('forgot.email')}
          placeholder={t('placeholders.email')}
          value={email}
          onChange={setEmail}
          check={check.email}
        />
        <Button type="submit" fullWidth isPending={pending}>
          {t('forgot.submit')}
        </Button>
      </Form>
      <p className="mt-4 text-center">
        <Link href="/login">{t('common.backToLogin')}</Link>
      </p>
    </>
  )
}
