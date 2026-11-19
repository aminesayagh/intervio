import { useTranslation } from 'react-i18next'
import { Title } from '../../ui-kit'
import { Link } from '../../navigation'

/** Screen 6: reset link sent. Same answer whether or not the account exists. */
export function ResetLinkSentPage() {
  const { t } = useTranslation('auth')
  return (
    <>
      <Title>{t('resetSent.title')}</Title>
      <p className="mb-5">{t('resetSent.body')}</p>
      <Link href="/login">{t('common.backToLogin')}</Link>
    </>
  )
}
