import {
  Input,
  TextField as AriaTextField,
  type TextFieldProps,
} from 'react-aria-components'
import { cn } from '../cn'
import { Show } from '../views/Show'
import { fieldLook, fieldMargin, type FieldLook } from './styles'

/**
 * A one-line text field: React Aria's TextField and Input, in one of the editable
 * looks (cell, panel, title). The value, its saving and its checks belong to the
 * caller.
 */
export function TextInput({
  look = 'cell',
  placeholder,
  busy,
  fit = false,
  className,
  ...props
}: Omit<TextFieldProps, 'className'> & {
  look?: FieldLook
  placeholder?: string
  /** A save is running. */
  busy?: boolean
  /** As wide as its text (what follows it, an icon, comes right after), not the row. */
  fit?: boolean
  className?: string
}) {
  const input = (
    <Input
      placeholder={placeholder}
      aria-busy={busy || undefined}
      className={cn(
        'w-full min-w-0 cursor-text truncate bg-transparent outline-none placeholder:text-muted',
        fieldLook[look],
        fit && 'absolute inset-0',
      )}
    />
  )
  return (
    <AriaTextField
      {...props}
      className={cn(
        // Fitted: as wide as its text (the invisible copy below), never wider than
        // the room left; the input lies over the copy.
        fit
          ? 'relative inline-block max-w-full min-w-16 overflow-hidden'
          : 'flex min-w-0',
        // Fitted, the pull that lines the text up is on the start side only, so
        // what follows (an icon) comes right after the field.
        fit ? fieldMargin[look].replace('-mx-', '-ms-') : fieldMargin[look],
        className,
      )}
    >
      <Show as="span" when={fit} className="contents">
        <span
          aria-hidden
          // 8 px more at the end than the input: an input keeps a few pixels of its
          // own beyond its text (the caret), which plain text doesn't.
          className={cn(
            'invisible block whitespace-pre',
            fieldLook[look],
            'pe-[calc(var(--spacing)*4)]',
          )}
        >
          {String(props.value ?? '') || placeholder || ' '}
        </span>
      </Show>
      {input}
    </AriaTextField>
  )
}
