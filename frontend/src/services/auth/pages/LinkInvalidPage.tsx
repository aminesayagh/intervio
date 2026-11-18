import { useTranslation } from 'react-i18next'
import { Link } from '../../navigation'
import { Title } from '../components/Parts'

/** Shown for any expired or already used email link. */
export function LinkInvalidPage() {
  const { t } = useTranslation('auth')
  return (
    <>
      <Title>{t('linkInvalid.title')}</Title>
      <p className="mb-8">{t('linkInvalid.body')}</p>
      <Link href="/login">{t('common.backToLogin')}</Link>
    </>
  )
}
