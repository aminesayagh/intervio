import { useTranslation } from 'react-i18next'
import { Link } from '../../../navigation'
import { Title } from '../../../ui-kit'

/** "Step X of 3" above the step's title. */
export function StepTitle({
  step,
  children,
}: {
  step: number
  children: string
}) {
  const { t } = useTranslation('companies')
  return (
    <>
      <p className="mb-1 text-xs text-muted">{t('step', { step })}</p>
      <Title>{children}</Title>
    </>
  )
}

/** "Back" on the left and, for optional steps, "Skip" on the right. */
export function StepLinks({ back, skip }: { back: string; skip?: () => void }) {
  const { t } = useTranslation('companies')
  return (
    <div className="mt-4 flex items-center justify-between">
      <Link href={back}>{t('back')}</Link>
      {skip && (
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={skip}
        >
          {t('skip')}
        </button>
      )}
    </div>
  )
}
