import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { setLanguage, type Language } from '../i18n'
import { Link } from '../navigation'
import { applyTheme, initialTheme, type Theme } from './theme'

/** Public screens (accounts, onboarding): header, then a centered column (grid columns 5–8). */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-separator px-4 md:px-[72px]">
        <Link href="/" className="text-xl">
          Intervio
        </Link>
        <div className="flex items-center gap-6">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[416px] px-4 pt-14 pb-16 md:px-0 md:pt-28">
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
  return (
    <button
      type="button"
      aria-label={t(next === 'dark' ? 'switchToDark' : 'switchToLight')}
      onClick={() => {
        applyTheme(next, true)
        setTheme(next)
      }}
    >
      {/* Half-filled circle */}
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M12 1a11 11 0 0 0 0 22z" fill="currentColor" />
      </svg>
    </button>
  )
}
