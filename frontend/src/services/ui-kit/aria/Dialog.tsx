import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { cn } from '../cn'
import { Button } from './Button'

/**
 * A confirmation (spec 7.4, 7.6): a title, a sentence, Cancel and the confirming
 * button (red when it removes or loses something). Modals are kept for these only.
 */
export function ConfirmDialog({
  open,
  title,
  text,
  confirm,
  cancel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  text: string
  confirm: string
  cancel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <ModalOverlay
      isOpen={open}
      onOpenChange={(isOpen) => !isOpen && onCancel()}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <Modal className="w-full max-w-[440px] rounded-[var(--field-radius)] border border-border bg-surface p-6 shadow-lg outline-none">
        <Dialog role="alertdialog" className="flex flex-col gap-2 outline-none">
          <Heading slot="title" className="text-lg font-medium">
            {title}
          </Heading>
          <p className="text-muted">{text}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button look="ghost" onPress={onCancel}>
              {cancel}
            </Button>
            <Button
              autoFocus
              onPress={onConfirm}
              className={cn(
                danger && 'bg-danger text-white data-[hovered]:bg-danger',
              )}
            >
              {confirm}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
