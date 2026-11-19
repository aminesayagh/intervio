import { useTranslation } from 'react-i18next'

// ponytail: title only until interventions and resources exist (decision 83).
function PageTitle({ children }: { children: string }) {
  return <h1 className="text-xl font-medium">{children}</h1>
}

export function DashboardPage() {
  const { t } = useTranslation('client-board')
  return <PageTitle>{t('nav.dashboard')}</PageTitle>
}

export function ResourcesPage() {
  const { t } = useTranslation('client-board')
  return <PageTitle>{t('nav.resources')}</PageTitle>
}
