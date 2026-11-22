import {
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  type TabListProps,
  type TabPanelProps,
  type TabProps,
} from 'react-aria-components'
import { cn } from '../cn'

export { Tabs } from 'react-aria-components'

/** The row of tabs. */
export function TabList<T extends object>({
  className,
  ...props
}: Omit<TabListProps<T>, 'className'> & { className?: string }) {
  return <AriaTabList {...props} className={cn('flex gap-4', className)} />
}

/** A tab: muted, underlined in the text color when chosen. */
export function Tab({
  className,
  ...props
}: Omit<TabProps, 'className'> & { className?: string }) {
  return (
    <AriaTab
      {...props}
      className={cn(
        '-mb-px cursor-pointer border-b-2 border-transparent py-1.5 text-muted outline-none data-[focus-visible]:text-foreground data-[selected]:border-foreground data-[selected]:text-foreground',
        className,
      )}
    />
  )
}

/** A tab's content. */
export function TabPanel({
  className,
  ...props
}: Omit<TabPanelProps, 'className'> & { className?: string }) {
  return <AriaTabPanel {...props} className={cn('outline-none', className)} />
}
