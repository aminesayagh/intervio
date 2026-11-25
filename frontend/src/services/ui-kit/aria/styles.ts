/**
 * Defaults shared by the React Aria components (decision: React Aria, styled once
 * here with Intervio's tokens from theme.css).
 */

/** The keyboard focus ring: only for the keyboard, never on a click. */
export const focusRing =
  'outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-foreground'

/**
 * How an editable value looks (spec 7.3.1): `cell` in the table, plain text with
 * only the cursor as a cue; `panel` and `title` in the panel, a light field under
 * the pointer or the focus.
 */
export type FieldLook = 'cell' | 'panel' | 'title'

/**
 * A value in the panel: a chip, thinly bordered, whose border takes the primary
 * color while it is being edited (its field focused, its menu open).
 */
export const chip =
  'rounded-[var(--field-radius)] border border-border px-1.5 py-0.5 focus-within:border-[var(--color-primary)] aria-expanded:border-[var(--color-primary)]'

/**
 * The panel's "Add …" button: an empty value's (Add Status) and the files' (Add
 * Files) share it. No background under the pointer, as values.
 */
export const addLook =
  'inline-flex h-6 w-fit cursor-pointer items-center gap-1 rounded-[var(--field-radius)] border border-border px-2 text-xs font-normal text-muted outline-none hover:text-foreground focus-visible:border-foreground data-[hovered]:bg-transparent'

export const fieldLook: Record<FieldLook, string> = {
  cell: 'p-0',
  panel: chip,
  title: 'rounded-[var(--field-radius)] px-2 py-1 text-xl font-medium',
}

/** The title reaches 8 px out on each side, so its text lines up with the rest. */
export const fieldMargin: Record<FieldLook, string> = {
  cell: '',
  panel: '',
  title: '-mx-2',
}
