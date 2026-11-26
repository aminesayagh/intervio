import { Check } from 'lucide-react'
import type { HTMLAttributes, ReactNode, RefObject } from 'react'
import {
  Autocomplete,
  Header,
  Input,
  Menu,
  MenuItem as AriaMenuItem,
  MenuSection,
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
              <span className="flex size-4 shrink-0 items-center justify-center text-muted">
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
export type MenuAction = {
  id: string
  label: string
  danger?: boolean
  /** A small icon before the label (a lucide icon at 14 px). */
  icon?: ReactNode
}

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
      className={cn(
        itemLook,
        action.icon && 'flex items-center gap-2',
        action.danger && 'text-danger',
      )}
    >
      {action.icon}
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

/**
 * One entry of a command menu, with its icon. An `always` one stays whatever is
 * typed (the "Ask: …" of a free request). Entries with a `section` are grouped
 * under its title, in the order the sections first appear, a line between groups.
 */
export type Command = {
  id: string
  label: string
  icon: ReactNode
  always?: boolean
  section?: string
}

/** The filter of command menus: by label, accents, case and punctuation aside ("todo" finds "To-do"). */
function useCommandFilter() {
  const { contains } = useFilter({ sensitivity: 'base' })
  const bare = (text: string) => text.replace(/[^\p{L}\p{N} ]/gu, '')
  return (text: string, input: string, node: { value: unknown }) =>
    !!(node.value as Command | null)?.always ||
    contains(bare(text), bare(input))
}

function CommandItems({
  label,
  commands,
  onAction,
  empty,
}: {
  label: string
  commands: Command[]
  onAction: (id: string) => void
  empty: string
}) {
  const item = (command: Command) => (
    <AriaMenuItem
      key={command.id}
      id={command.id}
      textValue={command.label}
      value={command}
      className={itemLook}
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-muted">
        {command.icon}
      </span>
      {command.label}
    </AriaMenuItem>
  )
  const sections = [...new Set(commands.map((command) => command.section))]
  return (
    <Menu
      aria-label={label}
      onAction={(key) => onAction(String(key))}
      renderEmptyState={() => (
        <div className="px-2 py-1 text-muted">{empty}</div>
      )}
      className="max-h-[320px] overflow-auto outline-none"
    >
      {sections.map((section) =>
        section === undefined ? (
          commands.filter((command) => !command.section).map(item)
        ) : (
          <MenuSection
            key={section}
            id={section}
            // A line above each group but the first one shown (filtering may hide some).
            className="mt-1 border-t border-border pt-1 first:mt-0 first:border-t-0 first:pt-0"
          >
            <Header className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted">
              {section}
            </Header>
            {commands
              .filter((command) => command.section === section)
              .map(item)}
          </MenuSection>
        ),
      )}
    </Menu>
  )
}

/**
 * A search field over a menu of commands, the typing filtering them (React Aria's
 * Autocomplete): the focus stays in the field, the arrows move in the menu and Enter
 * runs the highlighted command. For inside a popover (the description's Ask AI).
 */
export function CommandSearch({
  label,
  placeholder,
  commands,
  value,
  onChange,
  onAction,
  empty,
}: {
  label: string
  placeholder: string
  commands: Command[]
  value: string
  onChange: (value: string) => void
  onAction: (id: string) => void
  empty: string
}) {
  const filter = useCommandFilter()
  return (
    <Autocomplete filter={filter} inputValue={value} onInputChange={onChange}>
      <TextField aria-label={label} autoFocus className="flex">
        <Input
          placeholder={placeholder}
          className="w-full min-w-0 border-b border-border bg-transparent px-2 pt-1 pb-2 outline-none placeholder:text-muted"
        />
      </TextField>
      <div className="pt-1">
        <CommandItems
          label={label}
          commands={commands}
          onAction={onAction}
          empty={empty}
        />
      </div>
    </Autocomplete>
  )
}

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
  const filter = useCommandFilter()
  return (
    <Autocomplete filter={filter} inputValue={value} onInputChange={onChange}>
      <Popover
        triggerRef={anchor}
        isOpen
        isNonModal
        trigger="MenuTrigger"
        placement="bottom start"
        offset={4}
        style={{ minWidth: 240 }}
        className="rounded-[var(--field-radius)] border border-border bg-surface p-1 text-sm shadow-md outline-none"
      >
        <TextField aria-label={label} autoFocus className="sr-only">
          <Input {...inputProps} ref={inputRef} />
        </TextField>
        <CommandItems
          label={label}
          commands={commands}
          onAction={onAction}
          empty={empty}
        />
      </Popover>
    </Autocomplete>
  )
}
