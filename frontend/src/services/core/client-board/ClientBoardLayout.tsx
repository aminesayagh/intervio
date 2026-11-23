import { Button, Drawer, Dropdown, Label, Separator } from '@heroui/react'
import { motion, useReducedMotion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrentUser, useLogOut } from '../../auth'
import { setLanguage } from '../../i18n'
import { Link, navigate, usePath } from '../../navigation'
import {
  applyTheme,
  foldSidebar,
  Icon,
  Show,
  useSidebarFolded,
  useTheme,
  useTopBarBack,
} from '../../ui-kit'
import { SidebarInterventions } from '../interventions'

const TABS = [
  { href: '/dashboard', label: 'nav.dashboard', icon: 'Grid - 3' },
  { href: '/resources', label: 'nav.resources', icon: 'Folder' },
] as const

const COLLAPSED_KEY = 'intervio.sidebarCollapsed'

function savedCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true'
  } catch {
    return false // storage can be blocked; the sidebar opens full width
  }
}

/**
 * Signed-in client screens: a 264 px sidebar that collapses to a 57 px rail of icons,
 * and a drawer below 1024 px (decisions 66, 84, 85).
 */
export function ClientBoardLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation('client-board')
  const [menuOpen, setMenuOpen] = useState(false)
  const back = useTopBarBack()
  const [collapsed, setCollapsed] = useState(savedCollapsed)
  const reduceMotion = useReducedMotion()
  // A record panel at medium width folds the sidebar while it is open (spec 9).
  const folded = useSidebarFolded()
  const rail = collapsed || folded

  function toggleCollapsed() {
    if (folded) return foldSidebar(false) // unfolds for now; the saved choice stays
    setCollapsed(!collapsed)
    try {
      localStorage.setItem(COLLAPSED_KEY, String(!collapsed))
    } catch {
      // not remembered; the choice holds until the page is reloaded
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-sm text-foreground">
      <motion.aside
        initial={false}
        animate={{ width: rail ? 57 : 264 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
        className="sticky top-0 hidden h-screen shrink-0 overflow-hidden border-e border-border lg:flex"
      >
        <Sidebar collapsed={rail} onToggle={toggleCollapsed} />
      </motion.aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center gap-3 px-4 lg:hidden">
          {/* Up one level, when the screen offers it (decision 128). */}
          <Show as="span" when={back} className="flex">
            {(up) => (
              <button
                type="button"
                aria-label={up.label}
                className="flex text-muted hover:text-foreground"
                onClick={up.run}
              >
                <Icon name="Arrow - Left-1" size={20} />
              </button>
            )}
          </Show>
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
            <Sidebar
              collapsed={false}
              onNavigate={() => setMenuOpen(false)}
              onToggle={() => setMenuOpen(false)}
            />
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

/** Collapsed: only the toggle, the tab icons and the profile initial stay (decision 85). */
function Sidebar({
  collapsed,
  onNavigate,
  onToggle,
}: {
  collapsed: boolean
  onNavigate?: () => void
  onToggle: () => void
}) {
  const { t } = useTranslation('client-board')
  const path = usePath()
  const toggleLabel = t(collapsed ? 'nav.expandSidebar' : 'nav.collapseSidebar')
  return (
    <div
      className={`flex h-full w-full flex-col py-4 ${collapsed ? 'px-2' : 'px-4'}`}
    >
      <div
        className={`flex h-8 items-center ${collapsed ? 'justify-center' : 'justify-between'}`}
      >
        {!collapsed && (
          <FadeIn>
            <Logo onNavigate={onNavigate} />
          </FadeIn>
        )}
        <button
          type="button"
          aria-label={toggleLabel}
          title={toggleLabel}
          aria-expanded={!collapsed}
          className="group flex size-8 items-center justify-center rounded-[var(--field-radius)] text-muted hover:bg-default hover:text-foreground"
          onClick={onToggle}
        >
          {collapsed ? (
            // Collapsed: the logo, which turns into the expand icon on hover or focus.
            <>
              <img
                src="/logo.svg"
                alt=""
                width={24}
                height={24}
                className="group-hover:hidden group-focus-visible:hidden"
              />
              <span className="hidden group-hover:flex group-focus-visible:flex">
                <Icon name="Sidebar" size={18} />
              </span>
            </>
          ) : (
            <Icon name="Sidebar" size={18} />
          )}
        </button>
      </div>
      <nav className="mt-6 flex flex-col gap-1">
        <p
          className={`mb-1 h-4 truncate px-2 text-xs text-muted ${collapsed ? 'invisible' : ''}`}
        >
          {t('nav.main')}
        </p>
        {TABS.map((tab) => {
          const active = path === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              aria-label={collapsed ? t(tab.label) : undefined}
              title={collapsed ? t(tab.label) : undefined}
              className={`flex h-9 items-center gap-2 rounded-[var(--field-radius)] ${
                collapsed ? 'justify-center' : 'px-2'
              } ${
                active
                  ? 'bg-default font-medium text-foreground'
                  : 'text-muted hover:bg-default hover:text-foreground'
              }`}
            >
              <Icon name={tab.icon} size={18} />
              {!collapsed && <FadeIn>{t(tab.label)}</FadeIn>}
            </Link>
          )
        })}
      </nav>
      <SidebarInterventions collapsed={collapsed} onNavigate={onNavigate} />
      <div className="mt-auto">
        <ProfileMenu collapsed={collapsed} />
      </div>
    </div>
  )
}

/** Name and email; opens Manage profile, language, theme and log out (decision 81). */
function ProfileMenu({ collapsed }: { collapsed: boolean }) {
  const { t, i18n } = useTranslation('client-board')
  const { data: user } = useCurrentUser()
  const logOut = useLogOut()
  const theme = useTheme()

  function onAction(key: React.Key) {
    if (key === 'profile') navigate('/settings/profile')
    if (key === 'language') setLanguage(i18n.language === 'fr' ? 'en' : 'fr')
    if (key === 'theme') applyTheme(theme === 'dark' ? 'light' : 'dark', true)
    if (key === 'logout') void logOut()
  }

  return (
    <Dropdown>
      <Button
        variant="ghost"
        fullWidth
        aria-label={collapsed ? user?.fullName : undefined}
        className={`h-auto gap-2 py-1.5 text-start ${
          collapsed ? 'justify-center px-0' : 'justify-start px-2'
        }`}
      >
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[var(--field-radius)] bg-default font-medium">
          {user?.photoUrl ? (
            <img
              src={user.photoUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="size-full object-cover"
            />
          ) : (
            user?.fullName.charAt(0).toUpperCase()
          )}
        </span>
        {!collapsed && (
          <FadeIn className="flex min-w-0 flex-1 items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {user?.fullName}
              </span>
              <span className="block truncate text-xs text-muted">
                {user?.email}
              </span>
            </span>
            <Icon name="More-1" size={18} className="text-muted" />
          </FadeIn>
        )}
      </Button>
      <Dropdown.Popover placement="top start" className="min-w-[232px]">
        <Dropdown.Menu onAction={onAction}>
          <Dropdown.Item id="profile" textValue={t('profile.manage')}>
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
          <Dropdown.Item
            id="logout"
            textValue={t('profile.logOut')}
            variant="danger"
          >
            <Icon name="Turn off" size={18} className="text-danger" />
            <Label>{t('profile.logOut')}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}

/** Labels fade in once the sidebar has widened, so they never wrap mid-animation. */
function FadeIn({
  children,
  className = 'truncate',
}: {
  children: ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: reduceMotion ? 0 : 0.15,
        delay: reduceMotion ? 0 : 0.1,
      }}
      className={className}
    >
      {children}
    </motion.span>
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
