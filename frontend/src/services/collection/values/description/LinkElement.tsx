import type { TLinkElement } from 'platejs'
import { PlateElement, type PlateElementProps } from 'platejs/react'

/** A link inside the editor: an `<a>` to its address (its looks come from EditorText). */
export function LinkElement(props: PlateElementProps<TLinkElement>) {
  return (
    <PlateElement
      {...props}
      as="a"
      attributes={{ ...props.attributes, href: props.element.url }}
    />
  )
}
