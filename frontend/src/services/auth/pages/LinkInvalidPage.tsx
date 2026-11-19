import { useTranslation } from 'react-i18next'
import { Title } from '../../ui-kit'
import { Link } from '../../navigation'

/** Shown for any expired or already used email link. */
export function LinkInvalidPage() {
  const { t } = useTranslation('auth')
  return (
    <>
      <Title>{t('linkInvalid.title')}</Title>
      <p className="mb-5">{t('linkInvalid.body')}</p>
      <Link href="/login">{t('common.backToLogin')}</Link>
    </>
  )
}
