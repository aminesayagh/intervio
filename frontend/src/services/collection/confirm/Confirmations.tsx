import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../../ui-kit'
import { useAsked } from './confirm'

/**
 * Shows the confirmations asked by any collection screen or record (spec 8.3).
 * Mounted once, beside `<Notifications />`, so a confirmation shows even when the
 * screen that asked is not the one on screen.
 */
export function Confirmations() {
  const { t } = useTranslation('collection')
  const asked = useAsked()
  return (
    <ConfirmDialog
      open={asked !== null}
      title={asked?.title ?? ''}
      text={asked?.text ?? ''}
      confirm={asked?.button ?? ''}
      cancel={asked?.cancel ?? t('actions.cancel')}
      danger={asked?.danger}
      onConfirm={() => asked?.answer(true)}
      onCancel={() => asked?.answer(false)}
    />
  )
}
