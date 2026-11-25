import {
  useTodoListElement,
  useTodoListElementState,
} from '@platejs/list-classic/react'
import type { TElement } from 'platejs'
import { PlateElement, type PlateElementProps } from 'platejs/react'
import { Checkbox, cn, Show } from '../../../ui-kit'

/**
 * A list's item. In a to-do list, its checkbox first: ticked by whoever may edit the
 * text (the tick is part of it), read only for the others; a ticked item is greyed.
 */
export function ListItemElement(props: PlateElementProps) {
  const todo = 'checked' in props.element
  const state = useTodoListElementState({ element: props.element })
  const { checkboxProps } = useTodoListElement(state)
  return (
    <PlateElement
      {...props}
      as="li"
      className={cn(
        todo && 'flex list-none items-start gap-2',
        todo && checkboxProps.checked && 'text-muted line-through',
      )}
    >
      <span contentEditable={false} className="contents">
        <Show as="span" when={todo} className="flex h-[1lh] items-center">
          <Checkbox
            aria-label={props.editor.api.string(props.element)}
            isSelected={checkboxProps.checked}
            onChange={checkboxProps.onCheckedChange}
            isReadOnly={state.readOnly}
          />
        </Show>
      </span>
      <span className="min-w-0 flex-1">{props.children}</span>
    </PlateElement>
  )
}

/** A Markdown image, shown in its line (descriptions don't add images: #36). */
export function ImageElement(
  props: PlateElementProps<TElement & { url: string; alt: string }>,
) {
  return (
    <PlateElement {...props} as="span">
      <img
        contentEditable={false}
        src={props.element.url}
        alt={props.element.alt}
        className="inline max-h-64 max-w-full rounded-[var(--field-radius)] align-bottom"
      />
      {props.children}
    </PlateElement>
  )
}
