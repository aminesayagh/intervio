import { Button, Drawer, Dropdown, Label, Separator } from '@heroui/react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrentUser, useLogOut } from '../../auth'
import { setLanguage } from '../../i18n'
import { Link, usePath } from '../../navigation'
import { applyTheme, Icon, initialTheme, type Theme } from '../../ui-kit'

const TABS = [
  { href: '/dashboard', label: 'nav.dashboard', icon: 'Grid - 3' },
  { href: '/resources', label: 'nav.resources', icon: 'Work' },
] as const

/** Signed-in client screens: a 264 px sidebar, a drawer below 1024 px (decisions 66, 84). */
export function ClientBoardLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation('client-board')
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="flex min-h-screen bg-background text-sm text-foreground">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 border-e border-border lg:flex">
        <Sidebar />
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center gap-3 px-4 lg:hidden">
          <button
            type="button"
            aria-label={t('nav.openMenu')}
            className="flex text-muted hover:text-foreground"
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="Menu-1" size={20} />
          </button>
          <Logo />
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
      <Drawer.Backdrop isOpen={menuOpen} onOpenChange={setMenuOpen}>
        <Drawer.Content placement="left" className="w-[264px] max-w-full">
          <Drawer.Dialog aria-label={t('nav.main')} className="h-full p-0">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </div>
  )
}

function Logo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className="flex items-center gap-2 text-lg"
    >
      <img src="/logo.svg" alt="" width={24} height={24} />
      Intervio
    </Link>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('client-board')
  const path = usePath()
  return (
    <div className="flex h-full w-full flex-col p-4">
      <div className="flex h-8 items-center">
        <Logo onNavigate={onNavigate} />
      </div>
      <nav className="mt-6 flex flex-col gap-0.5">
        <p className="mb-1 px-2 text-xs text-muted">{t('nav.main')}</p>
        {TABS.map((tab) => {
          const active = path === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex h-8 items-center gap-2 rounded-[var(--field-radius)] px-2 ${
                active
                  ? 'bg-default font-medium text-foreground'
                  : 'text-muted hover:bg-default hover:text-foreground'
              }`}
            >
              <Icon name={tab.icon} size={18} />
              {t(tab.label)}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto">
        <ProfileMenu />
      </div>
    </div>
  )
}

/** Name and email; opens Manage profile, language, theme and log out (decision 81). */
function ProfileMenu() {
  const { t, i18n } = useTranslation('client-board')
  const { data: user } = useCurrentUser()
  const logOut = useLogOut()
  const [theme, setTheme] = useState<Theme>(initialTheme)

  function onAction(key: React.Key) {
    if (key === 'language') setLanguage(i18n.language === 'fr' ? 'en' : 'fr')
    if (key === 'theme') {
      const next = theme === 'dark' ? 'light' : 'dark'
      applyTheme(next, true)
      setTheme(next)
    }
    if (key === 'logout') void logOut()
  }

  return (
    <Dropdown>
      <Button
        variant="ghost"
        fullWidth
        className="h-auto justify-start gap-2 px-2 py-1.5 text-start"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--field-radius)] bg-default font-medium">
          {user?.fullName.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{user?.fullName}</span>
          <span className="block truncate text-xs text-muted">
            {user?.email}
          </span>
        </span>
        <Icon name="More-1" size={18} className="text-muted" />
      </Button>
      <Dropdown.Popover placement="top start" className="min-w-[232px]">
        <Dropdown.Menu onAction={onAction}>
          <Dropdown.Item
            id="profile"
            textValue={t('profile.manage')}
            isDisabled
          >
            <Icon name="User" size={18} />
            <Label>{t('profile.manage')}</Label>
          </Dropdown.Item>
          <Dropdown.Item
            id="language"
            textValue={t('profile.language')}
            shouldCloseOnSelect={false}
          >
            <Icon name="Text" size={18} />
            <Label>{t('profile.language')}</Label>
            <Choice
              options={['EN', 'FR']}
              active={i18n.language === 'fr' ? 1 : 0}
            />
          </Dropdown.Item>
          <Dropdown.Item
            id="theme"
            textValue={t('profile.theme')}
            shouldCloseOnSelect={false}
          >
            <Icon name={theme === 'dark' ? 'Moon 2' : 'Sun'} size={18} />
            <Label>{t('profile.theme')}</Label>
            <Choice
              options={[t('profile.light'), t('profile.dark')]}
              active={theme === 'dark' ? 1 : 0}
            />
          </Dropdown.Item>
          <Separator />
          <Dropdown.Item id="logout" textValue={t('profile.logOut')}>
            <Icon name="Turn off" size={18} />
            <Label>{t('profile.logOut')}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}

/** "EN / FR" with the current choice in the text color. */
function Choice({ options, active }: { options: string[]; active: number }) {
  return (
    <span className="ms-auto flex gap-1 text-xs text-muted">
      {options.map((option, index) => (
        <span key={option} className="flex gap-1">
          {index > 0 && '/'}
          <span className={index === active ? 'text-foreground' : undefined}>
            {option}
          </span>
        </span>
      ))}
    </span>
  )
}
