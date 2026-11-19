import { Button, Form, Modal } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { currentUserKey, useCurrentUser } from '../../auth'
import { navigate } from '../../navigation'
import { check, Field, FormError, Notice } from '../../ui-kit'
import { errorKey, profileApi } from './api'
import { SettingsLayout } from './SettingsLayout'

/** Settings, Security (decisions 89, 90). */
export function SecurityPage() {
  const { t } = useTranslation('settings')
  return (
    <SettingsLayout
      heading={t('security.title')}
      description={t('security.description')}
    >
      <div className="grid max-w-[960px] gap-8 min-[1400px]:grid-cols-[456px_1fr]">
        <div className="max-w-[456px]">
          <Password />
        </div>
        <div className="flex max-w-[456px] flex-col gap-8">
          <SignInMethods />
          <OtherDevices />
          <DeleteAccount />
        </div>
      </div>
    </SettingsLayout>
  )
}

function Section({
  title,
  text,
  children,
}: {
  title: string
  text?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-medium">{title}</h3>
        {text && <p className="text-muted">{text}</p>}
      </div>
      {children}
    </section>
  )
}

/** Change the password, or set one for a user who signed up with Google or a link. */
function Password() {
  const { t } = useTranslation('settings')
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)
  const hasPassword = user?.hasPassword ?? false

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setDone(false)
    setPending(true)
    try {
      await profileApi.changePassword(hasPassword ? current : null, next)
      setCurrent('')
      setNext('')
      setAgain('')
      setDone(true)
      await queryClient.invalidateQueries({ queryKey: currentUserKey })
    } catch (e) {
      setError(errorKey(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <Section
      title={t(hasPassword ? 'security.password' : 'security.setPassword')}
    >
      <Form onSubmit={save} className="flex flex-col gap-3">
        <FormError
          message={
            error && t(error, { defaultValue: t('errors.ERROR_UNKNOWN') })
          }
        />
        {done && <Notice>{t('security.passwordChanged')}</Notice>}
        {hasPassword && (
          <Field
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            label={t('security.currentPassword')}
            placeholder="••••••••••••"
            value={current}
            onChange={setCurrent}
            check={check.required}
          />
        )}
        <Field
          name="newPassword"
          type="password"
          autoComplete="new-password"
          label={t('security.newPassword')}
          placeholder="••••••••••••"
          value={next}
          onChange={setNext}
          check={check.newPassword}
        />
        <Field
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          label={t('security.confirmPassword')}
          placeholder="••••••••••••"
          value={again}
          onChange={setAgain}
          check={check.confirmation(next)}
        />
        <Button type="submit" isPending={pending} className="w-fit">
          {t(hasPassword ? 'security.changePassword' : 'security.setPassword')}
        </Button>
      </Form>
    </Section>
  )
}

function SignInMethods() {
  const { t } = useTranslation('settings')
  const { data: user } = useCurrentUser()
  return (
    <Section title={t('security.methods')}>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <span className="flex items-center gap-2">
          <img src="/icons/google.svg" alt="" width={16} height={16} />
          Google
        </span>
        <span className="text-muted">
          {t(
            user?.googleConnected
              ? 'security.connected'
              : 'security.notConnected',
          )}
        </span>
      </div>
    </Section>
  )
}

function OtherDevices() {
  const { t } = useTranslation('settings')
  const [state, setState] = useState<'idle' | 'pending' | 'done' | 'error'>(
    'idle',
  )
  async function end() {
    setState('pending')
    try {
      await profileApi.endOtherSessions()
      setState('done')
    } catch {
      setState('error')
    }
  }
  return (
    <Section title={t('security.devices')} text={t('security.devicesText')}>
      {state === 'done' && <Notice>{t('security.devicesDone')}</Notice>}
      <FormError
        message={state === 'error' ? t('errors.ERROR_UNKNOWN') : null}
      />
      <Button
        variant="danger"
        className="w-fit"
        isPending={state === 'pending'}
        onPress={end}
      >
        {t('security.logOutOthers')}
      </Button>
    </Section>
  )
}

/** Deleting asks the user to type their email (decision 90). */
function DeleteAccount() {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await profileApi.deleteAccount(email)
      queryClient.clear() // no user data survives the account
      navigate('/login', { replace: true })
    } catch (e) {
      setError(errorKey(e))
      setPending(false)
    }
  }

  return (
    <Section title={t('security.delete')} text={t('security.deleteText')}>
      <Button variant="danger" className="w-fit" onPress={() => setOpen(true)}>
        {t('security.delete')}
      </Button>
      <Modal.Backdrop
        isOpen={open}
        onOpenChange={(next) => {
          setOpen(next)
          setEmail('')
          setError(null)
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="rounded-[var(--field-radius)] sm:max-w-[480px]">
            <Form onSubmit={remove}>
              <Modal.Header>
                <Modal.Heading>{t('security.deleteTitle')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                <p>{t('security.deleteConfirm')}</p>
                <FormError
                  message={
                    error &&
                    t(error, { defaultValue: t('errors.ERROR_UNKNOWN') })
                  }
                />
                <Field
                  name="confirmEmail"
                  type="email"
                  label={t('security.typeEmail')}
                  placeholder={t('profile.emailPlaceholder')}
                  value={email}
                  onChange={setEmail}
                  check={check.email}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="secondary">
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="danger" isPending={pending}>
                  {t('security.delete')}
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Section>
  )
}
