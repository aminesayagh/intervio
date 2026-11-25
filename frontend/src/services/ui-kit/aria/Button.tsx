import { Button as AriaButton, type ButtonProps } from 'react-aria-components'
import { cn } from '../cn'
import { chip, focusRing } from './styles'

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

/**
 * A value that opens a menu when clicked (a status chip, an owner): it shows the
 * value unchanged, with a pointer cursor; in the panel, a light background under the
 * pointer.
 */
export function FieldButton({
  look = 'cell',
  className = '',
  ...props
}: ButtonProps & { look?: 'cell' | 'panel'; className?: string }) {
  return (
    <AriaButton
      {...props}
      className={cn(
        'flex max-w-full cursor-pointer rounded-[var(--field-radius)]',
        focusRing,
        look === 'panel' && chip,
        className,
      )}
    />
  )
}
