import {
  useTodoListElement,
  useTodoListElementState,
} from '@platejs/list-classic/react'
import { Play } from 'lucide-react'
import type { TElement } from 'platejs'
import { PlateElement, type PlateElementProps } from 'platejs/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

/**
 * A toggle: its title, then its content, folded away by the triangle before the
 * title (the part titles' triangle, always shown). It opens folded, unless it has no
 * content yet (a new one).
 */
export function ToggleElement(props: PlateElementProps) {
  const { t } = useTranslation('collection')
  const [open, setOpen] = useState(() => props.element.children.length < 2)
  const title = props.editor.api.string(props.element.children[0] as TElement)
  return (
    <PlateElement {...props} className="relative ps-5">
      <button
        type="button"
        contentEditable={false}
        aria-expanded={open}
        aria-label={t(open ? 'description.hide' : 'description.show', {
          name: title,
        })}
        onClick={() => setOpen(!open)}
        className="absolute start-0 top-0 flex h-[1lh] w-4 cursor-pointer items-center justify-center rounded-[var(--field-radius)] text-muted outline-none hover:bg-default focus-visible:outline-2 focus-visible:outline-foreground"
      >
        <Play
          size={8}
          fill="currentColor"
          className={cn(
            'transition-transform motion-reduce:transition-none',
            open && 'rotate-90',
          )}
        />
      </button>
      <div className={cn('[&>*+*]:mt-2', !open && '[&>*+*]:hidden')}>
        {props.children}
      </div>
    </PlateElement>
  )
}

/** A callout: its icon, then its text, on the fields' grey. */
export function CalloutElement(
  props: PlateElementProps<TElement & { icon?: string }>,
) {
  return (
    <PlateElement
      {...props}
      className="flex gap-2 rounded-[var(--field-radius)] bg-default px-3 py-2"
    >
      <span contentEditable={false} className="select-none">
        {props.element.icon ?? '💡'}
      </span>
      <div className="min-w-0 flex-1">{props.children}</div>
    </PlateElement>
  )
}

/** A table (its looks come from EditorText). */
export function TableElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} as="table">
      <tbody>{props.children}</tbody>
    </PlateElement>
  )
}

export const TableRowElement = (props: PlateElementProps) => (
  <PlateElement {...props} as="tr" />
)
export const TableCellElement = (props: PlateElementProps) => (
  <PlateElement {...props} as="td" />
)
export const TableHeaderCellElement = (props: PlateElementProps) => (
  <PlateElement {...props} as="th" />
)
