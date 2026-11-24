import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  Button,
  Input,
  NumberField as AriaNumberField,
  type NumberFieldProps,
} from 'react-aria-components'
import { cn } from '../cn'

const step =
  'flex h-[11px] w-4 cursor-pointer items-center justify-center rounded-[2px] text-muted outline-none data-[hovered]:bg-default data-[hovered]:text-foreground data-[focus-visible]:outline-1 data-[focus-visible]:outline-foreground data-[disabled]:cursor-default data-[disabled]:opacity-40'

/**
 * A number field: React Aria's NumberField (formatted for the language, kept within
 * its limits, arrow keys) with two small chevrons on the right that step it. In the
 * table (`cell`) the chevrons show under the pointer or the focus only; in the panel
 * the field is as wide as its number.
 */
export function NumberInput({
  look = 'cell',
  placeholder = '—',
  ...props
}: Omit<NumberFieldProps, 'className'> & {
  look?: 'cell' | 'panel'
  placeholder?: string
}) {
  return (
    <AriaNumberField
      {...props}
      className={cn(
        'group/number relative flex min-w-0 items-center',
        look === 'panel' && '-ms-2 w-fit max-w-full',
      )}
    >
      <Input
        placeholder={placeholder}
        className={cn(
          'w-full min-w-0 cursor-text bg-transparent p-0 pe-6 tabular-nums outline-none placeholder:text-muted',
          look === 'panel' &&
            'w-auto min-w-14 rounded-[var(--field-radius)] px-2 py-1 pe-6 [field-sizing:content] hover:bg-default focus:bg-default',
        )}
      />
      <span
        className={cn(
          'absolute end-0 flex flex-col gap-px',
          look === 'cell' &&
            'opacity-0 group-focus-within/number:opacity-100 group-hover/number:opacity-100',
          look === 'panel' && 'end-1',
        )}
      >
        <Button slot="increment" className={step}>
          <ChevronUp size={10} />
        </Button>
        <Button slot="decrement" className={step}>
          <ChevronDown size={10} />
        </Button>
      </span>
    </AriaNumberField>
  )
}
