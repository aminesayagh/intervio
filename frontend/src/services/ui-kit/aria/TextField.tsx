import {
  Input,
  TextField as AriaTextField,
  type TextFieldProps,
} from 'react-aria-components'
import { cn } from '../cn'
import { fieldLook, type FieldLook } from './styles'

/**
 * A one-line text field: React Aria's TextField and Input, in one of the editable
 * looks (cell, panel, title). The value, its saving and its checks belong to the
 * caller.
 */
export function TextInput({
  look = 'cell',
  placeholder,
  busy,
  className,
  ...props
}: Omit<TextFieldProps, 'className'> & {
  look?: FieldLook
  placeholder?: string
  /** A save is running. */
  busy?: boolean
  className?: string
}) {
  return (
    <AriaTextField {...props} className={cn('flex min-w-0', className)}>
      <Input
        placeholder={placeholder}
        aria-busy={busy || undefined}
        className={cn(
          'w-full min-w-0 cursor-text truncate bg-transparent outline-none placeholder:text-muted',
          fieldLook[look],
        )}
      />
    </AriaTextField>
  )
}
