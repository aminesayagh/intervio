import type { ReactNode } from 'react'
import {
  Button as AriaButton,
  Dialog,
  Heading,
  Menu,
  MenuItem as AriaMenuItem,
  Modal,
  ModalOverlay,
  Popover,
  Separator,
  type ButtonProps,
  type Key,
  type Selection,
} from 'react-aria-components'
import { cn, Icon } from '../ui-kit'

/**
 * The collection's building blocks: React Aria Components (accessible, unstyled),
 * styled with Intervio's tokens (theme.css), so the collection doesn't depend on a
 * design system's look.
 */

const focusRing =
  'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-foreground'

const buttonLook = {
  primary:
    'bg-[var(--color-primary)] text-[var(--color-text)] shadow-[0_4px_12px_color-mix(in_oklab,var(--color-primary)_35%,transparent)] data-[hovered]:bg-[var(--color-primary-hover)]',
  secondary:
    'bg-default text-foreground data-[hovered]:bg-[color-mix(in_srgb,var(--default)_80%,var(--foreground))]',
  ghost: 'text-foreground data-[hovered]:bg-default',
}

/** A button: primary (the main action, yellow), secondary (grey) or ghost. */
export function Button({
  look = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps & {
  look?: keyof typeof buttonLook
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <AriaButton
      {...props}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--field-radius)] font-medium',
        size === 'sm' ? 'h-8 px-3' : 'h-9 px-4',
        buttonLook[look],
        focusRing,
        'data-[disabled]:cursor-default data-[disabled]:opacity-50',
        className,
      )}
    />
  )
}

/** The popover under a menu's button. */
export function MenuPopover({
  children,
  minWidth = 200,
}: {
  children: ReactNode
  minWidth?: number
}) {
  return (
    <Popover
      placement="bottom start"
      offset={4}
      style={{ minWidth }}
      className="rounded-[var(--field-radius)] border border-border bg-surface p-1 shadow-md outline-none"
    >
      {children}
    </Popover>
  )
}

/** A menu of choices: several (check boxes) or one; the chosen ones show a check. */
export function ChoiceMenu({
  label,
  options,
  mode,
  selected,
  onChange,
}: {
  label: string
  options: { id: string; label: string }[]
  mode: 'single' | 'multiple'
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  return (
    <Menu
      aria-label={label}
      selectionMode={mode}
      selectedKeys={new Set<Key>(selected)}
      onSelectionChange={(keys: Selection) =>
        onChange(
          keys === 'all'
            ? options.map((option) => option.id)
            : [...keys].map(String),
        )
      }
      className="max-h-[320px] overflow-auto outline-none"
    >
      {options.map((option) => (
        <AriaMenuItem
          key={option.id}
          id={option.id}
          textValue={option.label}
          className="flex cursor-pointer items-center gap-2 rounded-[var(--field-radius)] px-2 py-1.5 outline-none data-[focused]:bg-default"
        >
          {({ isSelected }) => (
            <>
              <span className="flex size-4 shrink-0 items-center justify-center">
                {isSelected && <Icon name="Check" size={14} />}
              </span>
              {option.label}
            </>
          )}
        </AriaMenuItem>
      ))}
    </Menu>
  )
}

/** One entry of an action menu; `danger` ones are red and come after a separator. */
export type MenuAction = { id: string; label: string; danger?: boolean }

/** A menu of actions (More actions): a click runs the action. */
export function ActionMenu({
  label,
  actions,
  onAction,
}: {
  label: string
  actions: MenuAction[]
  onAction: (id: string) => void
}) {
  const plain = actions.filter((action) => !action.danger)
  const danger = actions.filter((action) => action.danger)
  const item = (action: MenuAction) => (
    <AriaMenuItem
      key={action.id}
      id={action.id}
      textValue={action.label}
      className={cn(
        'flex cursor-pointer items-center rounded-[var(--field-radius)] px-2 py-1.5 outline-none data-[focused]:bg-default',
        action.danger && 'text-danger',
      )}
    >
      {action.label}
    </AriaMenuItem>
  )
  return (
    <Menu
      aria-label={label}
      onAction={(key) => onAction(String(key))}
      className="outline-none"
    >
      {plain.map(item)}
      {danger.length > 0 && <Separator className="my-1 h-px bg-border" />}
      {danger.map(item)}
    </Menu>
  )
}

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
