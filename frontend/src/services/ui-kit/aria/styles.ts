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

export const fieldLook: Record<FieldLook, string> = {
  cell: 'p-0',
  panel:
    '-mx-2 rounded-[var(--field-radius)] px-2 py-1 data-[hovered]:bg-default data-[focused]:bg-default',
  title:
    '-mx-2 rounded-[var(--field-radius)] px-2 py-1 text-xl font-medium data-[hovered]:bg-default data-[focused]:bg-default',
}
