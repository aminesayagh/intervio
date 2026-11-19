import { Button, Form } from '@heroui/react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrentUser, type CurrentUser } from '../../auth'
import { ImagePicker } from '../../files'
import { setLanguage, type Language } from '../../i18n'
import {
  applyTheme,
  check,
  Field,
  FormError,
  Notice,
  Segmented,
  useTheme,
} from '../../ui-kit'
import { errorKey, profileApi, useSaveUser } from './api'
import { SettingsLayout } from './SettingsLayout'

/** Settings, Profile (decisions 87, 88): photo, name, email, then language and theme. */
export function ProfilePage() {
  const { t } = useTranslation('settings')
  const { data: user } = useCurrentUser()
  if (!user) return null
  return (
    <SettingsLayout
      heading={t('profile.title')}
      description={t('profile.description')}
    >
      <div className="flex max-w-[456px] flex-col gap-6">
        <Photo user={user} />
        {/* Remount when the email changes (confirmed or cancelled elsewhere), so the field starts from it. */}
        <Details key={`${user.email}|${user.pendingEmail}`} user={user} />
        <Preferences />
      </div>
    </SettingsLayout>
  )
}

function Photo({ user }: { user: CurrentUser }) {
  const { t } = useTranslation('settings')
  const saveUser = useSaveUser()
  // Only an uploaded photo can be removed; a Google photo comes back at the next Google log-in.
  const uploaded = user.photoUrl?.startsWith('/api/files/') ?? false
  return (
    <ImagePicker
      purpose="userPhoto"
      label={t('profile.photo')}
      src={user.photoUrl}
      fallback={user.fullName.charAt(0).toUpperCase()}
      uploadLabel={t('profile.uploadPhoto')}
      removeLabel={t('remove')}
      onUploaded={async (id) => saveUser(await profileApi.setPhoto(id))}
      onRemove={
        uploaded
          ? async () => saveUser(await profileApi.removePhoto())
          : undefined
      }
    />
  )
}

function Details({ user }: { user: CurrentUser }) {
  const { t } = useTranslation('settings')
  const saveUser = useSaveUser()
  const [name, setName] = useState(user.fullName)
  const [email, setEmail] = useState(user.pendingEmail ?? user.email)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)

  async function run(action: () => Promise<CurrentUser>) {
    setError(null)
    setSaved(false)
    setPending(true)
    try {
      saveUser(await action())
      return true
    } catch (e) {
      setError(errorKey(e))
      return false
    } finally {
      setPending(false)
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    let ok = true
    if (name.trim() !== user.fullName)
      ok = await run(() => profileApi.rename(name))
    const target = email.trim().toLowerCase()
    if (ok && target !== user.email && target !== user.pendingEmail)
      ok = await run(() => profileApi.changeEmail(email))
    if (ok && target === user.email && user.pendingEmail)
      ok = await run(() => profileApi.cancelEmailChange())
    setSaved(ok)
  }

  return (
    <Form onSubmit={save} className="flex flex-col gap-3">
      <FormError
        message={error && t(error, { defaultValue: t('errors.ERROR_UNKNOWN') })}
      />
      <Field
        name="fullName"
        autoComplete="name"
        label={t('profile.fullName')}
        placeholder={t('profile.fullNamePlaceholder')}
        value={name}
        onChange={setName}
        check={check.required}
      />
      <Field
        name="email"
        type="email"
        autoComplete="email"
        label={t('profile.email')}
        placeholder={t('profile.emailPlaceholder')}
        value={email}
        onChange={setEmail}
        check={check.email}
      />
      {user.pendingEmail && (
        <Notice>
          {t('profile.pending', {
            pending: user.pendingEmail,
            current: user.email,
          })}
          <span className="mt-2 flex gap-4">
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() =>
                void run(() => profileApi.changeEmail(user.pendingEmail!))
              }
            >
              {t('profile.resend')}
            </button>
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => void run(() => profileApi.cancelEmailChange())}
            >
              {t('profile.cancelChange')}
            </button>
          </span>
        </Notice>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" isPending={pending}>
          {t('save')}
        </Button>
        {saved && <span className="text-muted">{t('saved')}</span>}
      </div>
    </Form>
  )
}

function Preferences() {
  const { t, i18n } = useTranslation('settings')
  const theme = useTheme()
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      <h3 className="font-medium">{t('profile.preferences')}</h3>
      <Segmented<Language>
        label={t('profile.language')}
        value={i18n.language === 'fr' ? 'fr' : 'en'}
        onChange={setLanguage}
        options={[
          { value: 'en', label: 'English' },
          { value: 'fr', label: 'Français' },
        ]}
      />
      <Segmented
        label={t('profile.theme')}
        value={theme}
        onChange={(next) => applyTheme(next, true)}
        options={[
          { value: 'light', label: t('profile.light') },
          { value: 'dark', label: t('profile.dark') },
        ]}
      />
    </div>
  )
}
