import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { navigate } from './router'

/** An in-app link: navigates without reloading the page. */
export function Link({
  href,
  onClick,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (event.defaultPrevented || event.metaKey || event.ctrlKey) return
    event.preventDefault()
    navigate(href)
  }
  return (
    <a
      href={href}
      onClick={handleClick}
      className={className ?? 'underline underline-offset-4'}
      {...props}
    />
  )
}
