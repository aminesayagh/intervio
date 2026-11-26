import type { TLinkElement } from 'platejs'
import { PlateElement, type PlateElementProps } from 'platejs/react'

/**
 * A link in the description: an `<a>` to its address, opened in a new tab (its looks
 * come from EditorText).
 */
export function LinkElement(props: PlateElementProps<TLinkElement>) {
  return (
    <PlateElement
      {...props}
      as="a"
      attributes={{
        ...props.attributes,
        href: props.element.url,
        target: '_blank',
        rel: 'noopener noreferrer',
      }}
    />
  )
}
