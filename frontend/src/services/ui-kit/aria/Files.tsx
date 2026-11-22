import {
  DropZone as AriaDropZone,
  type DropZoneProps,
} from 'react-aria-components'
import { cn } from '../cn'

export { FileTrigger } from 'react-aria-components'

/**
 * An area files can be dropped on: React Aria's DropZone, with a dashed outline
 * while files are dragged over it.
 */
export function DropZone({
  className,
  ...props
}: Omit<DropZoneProps, 'className'> & { className?: string }) {
  return (
    <AriaDropZone
      {...props}
      className={cn(
        '-m-1 rounded-[var(--field-radius)] p-1 outline-none data-[drop-target]:bg-default data-[drop-target]:outline-dashed data-[drop-target]:outline-2 data-[drop-target]:outline-foreground',
        className,
      )}
    />
  )
}
