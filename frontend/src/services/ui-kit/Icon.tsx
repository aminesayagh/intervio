import type { CSSProperties } from 'react'

/**
 * An icon of the Intervio set in public/icons, by file name without ".svg" (for
 * example "Eye" or "Arrow - Left"). The file gives the shape; the color is the
 * current text color, so icons follow light and dark mode. Lucide icons come
 * from lucide-react instead.
 * Multicolor brand icons (Google) are used as plain <img> instead.
 */
export function Icon({
  name,
  size = 16,
  className = '',
}: {
  name: string
  size?: number
  className?: string
}) {
  const url = `url("/icons/${name.split('/').map(encodeURIComponent).join('/')}.svg")`
  const style: CSSProperties = {
    width: size,
    height: size,
    maskImage: url,
    WebkitMaskImage: url,
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={style}
    />
  )
}
