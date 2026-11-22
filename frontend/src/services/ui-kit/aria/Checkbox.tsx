import {
  Checkbox as AriaCheckbox,
  type CheckboxProps,
} from 'react-aria-components'
import { cn } from '../cn'
import { Icon } from '../Icon'
import { Variant } from '../views/Show'

/**
 * A checkbox: a 16 px box, filled with the text color and a check when on (a dash
 * when some are, for a checkbox that selects several); the
 * keyboard focus ring; a normal cursor when it is read only.
 */
export function Checkbox({
  className,
  ...props
}: Omit<CheckboxProps, 'className' | 'children'> & { className?: string }) {
  return (
    <AriaCheckbox
      {...props}
      className={cn(
        'group/check inline-flex cursor-pointer items-center outline-none data-[readonly]:cursor-default',
        className,
      )}
    >
      {({ isSelected, isIndeterminate }) => (
        <span className="flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-[var(--color-text-secondary)] text-background group-data-[indeterminate]/check:border-foreground group-data-[indeterminate]/check:bg-foreground group-data-[selected]/check:border-foreground group-data-[selected]/check:bg-foreground group-data-[focus-visible]/check:outline-2 group-data-[focus-visible]/check:outline-offset-2 group-data-[focus-visible]/check:outline-foreground">
          <Variant
            as="span"
            value={isIndeterminate ? 'some' : isSelected ? 'on' : 'off'}
            className="flex"
            views={{
              on: () => <Icon name="lucide/check" size={12} />,
              some: () => <Icon name="lucide/minus" size={12} />,
            }}
          />
        </span>
      )}
    </AriaCheckbox>
  )
}
