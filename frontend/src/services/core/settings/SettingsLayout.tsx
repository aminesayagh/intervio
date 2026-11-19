import { Button, Modal } from '@heroui/react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, usePath } from '../../navigation'
import { Icon } from '../../ui-kit'
import { useCompany } from '../companies'

/**
 * The Settings page (decision 86): its tabs in a vertical list on the left (Account: Profile,
 * Security; Companies: one tab per company, then "Add a company"), the open tab on the right
 * with its title and a short description.
 */
export function SettingsLayout({
  heading,
  description,
  children,
}: {
  heading: string
  description: string
  children: ReactNode
}) {
  const { t } = useTranslation('settings')
  const { data: company } = useCompany()
  const [addOpen, setAddOpen] = useState(false)
  return (
    <>
      <h1 className="text-xl font-medium">{t('title')}</h1>
      <div className="mt-6 flex flex-col gap-6 md:flex-row md:gap-10">
        <nav
          aria-label={t('title')}
          className="flex shrink-0 flex-col gap-4 md:w-[220px]"
        >
          <TabGroup label={t('nav.account')}>
            <Tab href="/settings/profile">{t('nav.profile')}</Tab>
            <Tab href="/settings/security">{t('nav.security')}</Tab>
          </TabGroup>
          <TabGroup label={t('nav.companies')}>
            {company && (
              <Tab href={`/settings/companies/${company.id}`}>
                {company.name}
              </Tab>
            )}
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex h-9 items-center gap-2 rounded-[var(--field-radius)] px-2 text-start text-muted hover:bg-default hover:text-foreground"
            >
              <Icon name="Add" size={16} />
              {t('nav.addCompany')}
            </button>
          </TabGroup>
        </nav>
        <section className="min-w-0 flex-1">
          <h2 className="text-lg font-medium">{heading}</h2>
          <p className="mt-0.5 text-muted">{description}</p>
          <div className="mt-6">{children}</div>
        </section>
      </div>
      <Modal.Backdrop isOpen={addOpen} onOpenChange={setAddOpen}>
        <Modal.Container>
          <Modal.Dialog className="rounded-[var(--field-radius)] sm:max-w-[440px]">
            <Modal.Header>
              <Modal.Heading>{t('addCompany.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p>{t('addCompany.text')}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                {t('close')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  )
}

function TabGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="mb-1 px-2 text-xs text-muted">{label}</p>
      {children}
    </div>
  )
}

function Tab({ href, children }: { href: string; children: ReactNode }) {
  const active = usePath() === href
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex h-9 items-center truncate rounded-[var(--field-radius)] px-2 ${
        active
          ? 'bg-default font-medium text-foreground'
          : 'text-muted hover:bg-default hover:text-foreground'
      }`}
    >
      {children}
    </Link>
  )
}
