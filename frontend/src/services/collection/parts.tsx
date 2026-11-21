import type { ReactNode } from 'react'
import {
  Button as AriaButton,
  Menu,
  MenuItem as AriaMenuItem,
  Popover,
  type ButtonProps,
  type Key,
  type Selection,
} from 'react-aria-components'
import { Icon } from '../ui-kit'

/**
 * The collection's building blocks: React Aria Components (accessible, unstyled),
 * styled with Intervio's tokens (theme.css), so the collection doesn't depend on a
 * design system's look.
 */

const focusRing =
  'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-foreground'

const buttonLook = {
  secondary:
    'bg-default text-foreground data-[hovered]:bg-[color-mix(in_srgb,var(--default)_80%,var(--foreground))]',
  ghost: 'text-foreground data-[hovered]:bg-default',
}

/** A button: secondary (grey) or ghost (no background until hovered). */
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
      className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--field-radius)] font-medium ${
        size === 'sm' ? 'h-8 px-3' : 'h-9 px-4'
      } ${buttonLook[look]} ${focusRing} data-[disabled]:cursor-default data-[disabled]:opacity-50 ${className}`}
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
