/**
 * The value as text, looking like its editor at rest. It takes the focus, so the
 * table's keyboard moves into it as into a field; the cell then wakes and moves the
 * focus to the editor.
 */
export function Asleep({ text, end }: { text: string | null; end?: boolean }) {
  return (
    <span
      data-asleep
      tabIndex={-1}
      className={
        end
          ? 'block truncate pe-6 tabular-nums outline-none'
          : 'block truncate tabular-nums outline-none'
      }
    >
      {text ?? <span className="text-muted">—</span>}
    </span>
  )
}
