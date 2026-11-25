import { Check } from 'lucide-react'
import type { HTMLAttributes, ReactNode, RefObject } from 'react'
import {
  Autocomplete,
  Input,
  Menu,
  MenuItem as AriaMenuItem,
  Popover,
  Separator,
  TextField,
  useFilter,
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

/** One entry of a command menu, with its icon. */
export type Command = { id: string; label: string; icon: ReactNode }

/**
 * A menu of commands filtered by typing (React Aria's Autocomplete), opened at
 * `anchor`: the focus stays in its input, the arrows move in the menu and Enter runs
 * the highlighted command. The input is invisible: the caller shows the typed text
 * where it belongs (the description's "/" menu shows it in the line). It lives in
 * the popover, outside any text editor, which would otherwise take its selection.
 */
export function CommandMenu({
  label,
  commands,
  value,
  onChange,
  onAction,
  empty,
  anchor,
  inputRef,
  inputProps,
}: {
  label: string
  commands: Command[]
  value: string
  onChange: (value: string) => void
  onAction: (id: string) => void
  /** Shown when nothing matches. */
  empty: string
  /** What the menu opens under. */
  anchor: RefObject<HTMLElement | null>
  inputRef: RefObject<HTMLInputElement | null>
  /** The caller's own handlers on the input (keys, blur). */
  inputProps?: HTMLAttributes<HTMLInputElement>
}) {
  const { contains } = useFilter({ sensitivity: 'base' })
  return (
    <Autocomplete filter={contains} inputValue={value} onInputChange={onChange}>
      <Popover
        triggerRef={anchor}
        isOpen
        isNonModal
        trigger="MenuTrigger"
        placement="bottom start"
        offset={4}
        style={{ minWidth: 200 }}
        className="rounded-[var(--field-radius)] border border-border bg-surface p-1 text-sm shadow-md outline-none"
      >
        <TextField aria-label={label} autoFocus className="sr-only">
          <Input {...inputProps} ref={inputRef} />
        </TextField>
        <Menu
          aria-label={label}
          items={commands}
          onAction={(key) => onAction(String(key))}
          renderEmptyState={() => (
            <div className="px-2 py-1 text-muted">{empty}</div>
          )}
          className="max-h-[320px] overflow-auto outline-none"
        >
          {(command) => (
            <AriaMenuItem
              id={command.id}
              textValue={command.label}
              className={itemLook}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {command.icon}
              </span>
              {command.label}
            </AriaMenuItem>
          )}
        </Menu>
      </Popover>
    </Autocomplete>
  )
}
