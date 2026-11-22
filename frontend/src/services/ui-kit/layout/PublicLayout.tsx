import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { setLanguage, type Language } from '../../i18n'
import { Link } from '../../navigation'
import { Icon } from '../Icon'
import { applyTheme, initialTheme, type Theme } from '../theme'

/** Public screens (accounts, onboarding): header, then a centered column (grid columns 5–8). */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-14 items-center justify-between px-4 md:px-[72px]">
        <Link href="/" className="flex items-center gap-2 text-lg">
          <img src="/logo.svg" alt="" width={24} height={24} />
          Intervio
        </Link>
        <div className="flex items-center gap-5">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[416px] px-4 text-sm pt-10 pb-12 md:px-0 md:pt-16">
        {children}
      </main>
    </div>
  )
}

function LanguageSwitch() {
  const { t, i18n } = useTranslation('ui-kit')
  const current = i18n.language as Language
  return (
    <div
      role="group"
      aria-label={t('language')}
      className="flex items-center gap-2 text-sm"
    >
      {(['en', 'fr'] as const).map((lang, index) => (
        <span key={lang} className="flex items-center gap-2">
          {index > 0 && <span className="text-muted">/</span>}
          <button
            type="button"
            onClick={() => setLanguage(lang)}
            aria-pressed={current === lang}
            className={current === lang ? 'text-foreground' : 'text-muted'}
          >
            {lang.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  )
}

function ThemeToggle() {
  const { t } = useTranslation('ui-kit')
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  const reduceMotion = useReducedMotion()
  return (
    <button
      type="button"
      className="flex text-muted hover:text-foreground"
      aria-label={t(next === 'dark' ? 'switchToDark' : 'switchToLight')}
      onClick={() => {
        applyTheme(next, true)
        setTheme(next)
      }}
    >
      {/* Shows the current mode; the icons turn and fade when it changes. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          className="flex"
          initial={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, rotate: -90, scale: 0.6 }
          }
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, rotate: 90, scale: 0.6 }
          }
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Icon name={theme === 'dark' ? 'Moon 2' : 'Sun'} size={20} />
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
