import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Menu,
  MenuItem as AriaMenuItem,
  Popover,
  Separator,
  type Key,
  type Selection,
} from 'react-aria-components'
import { cn } from '../cn'
import { Show } from '../views/Show'

export { MenuTrigger } from 'react-aria-components'

const itemLook =
  'flex cursor-pointer items-center gap-2 rounded-[var(--field-radius)] px-2 py-1 outline-none data-[focused]:bg-default'

/**
 * The popover under a menu's button. Menus render outside the page (a portal), so
 * the page's text size is set here.
 */
export function MenuPopover({
  children,
  minWidth = 200,
}: {
  children: ReactNode
  minWidth?: number
}) {
  return (
    <Popover
      placement="bottom start"
      offset={4}
      style={{ minWidth }}
      className="rounded-[var(--field-radius)] border border-border bg-surface p-1 text-sm shadow-md outline-none"
    >
      {children}
    </Popover>
  )
}

/** A menu of choices: several (check marks) or one; the chosen ones show a check. */
export function ChoiceMenu({
  label,
  options,
  mode,
  selected,
  onChange,
}: {
  label: string
  options: { id: string; label: string }[]
  mode: 'single' | 'multiple'
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  return (
    <Menu
      aria-label={label}
      selectionMode={mode}
      selectedKeys={new Set<Key>(selected)}
      onSelectionChange={(keys: Selection) =>
        onChange(
          keys === 'all'
            ? options.map((option) => option.id)
            : [...keys].map(String),
        )
      }
      className="max-h-[320px] overflow-auto outline-none"
    >
      {options.map((option) => (
        <AriaMenuItem
          key={option.id}
          id={option.id}
          textValue={option.label}
          className={itemLook}
        >
          {({ isSelected }) => (
            <>
              <span className="flex size-4 shrink-0 items-center justify-center">
                <Show as="span" when={isSelected} className="flex">
                  <Check size={14} />
                </Show>
              </span>
              {option.label}
            </>
          )}
        </AriaMenuItem>
      ))}
    </Menu>
  )
}

/** One entry of an action menu; `danger` ones are red and come after a separator. */
export type MenuAction = { id: string; label: string; danger?: boolean }

/** A menu of actions (More actions): a click runs the action. */
export function ActionMenu({
  label,
  actions,
  onAction,
}: {
  label: string
  actions: MenuAction[]
  onAction: (id: string) => void
}) {
  const plain = actions.filter((action) => !action.danger)
  const danger = actions.filter((action) => action.danger)
  const item = (action: MenuAction) => (
    <AriaMenuItem
      key={action.id}
      id={action.id}
      textValue={action.label}
      className={cn(itemLook, action.danger && 'text-danger')}
    >
      {action.label}
    </AriaMenuItem>
  )
  return (
    <Menu
      aria-label={label}
      onAction={(key) => onAction(String(key))}
      className="outline-none"
    >
      {plain.map(item)}
      {danger.length > 0 && <Separator className="my-1 h-px bg-border" />}
      {danger.map(item)}
    </Menu>
  )
}
