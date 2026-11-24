import {
  createPlateEditor,
  Plate,
  PlateContent,
  usePlateEditor,
} from 'platejs/react'
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { cn } from '../../../ui-kit'
import { descriptionPlugins, parseMarkdown, serializeMarkdown } from './plugins'

/** Why the editor can't go on: the text couldn't be read, or written back. */
export type MarkdownFailure = 'parse' | 'serialize'

/**
 * A Markdown text edited formatted (Plate, headless): Markdown in, Markdown out
 * through `onChange`, only after a real edit (opening never reports a change, though
 * Plate writes some marks its own way). A text it can't read or write goes to
 * `onFailure` instead, never as a partial string. Its children (the toolbar, the
 * `EditorText`) share the editor.
 */
export function PlateEditor({
  initial,
  onChange,
  onFailure,
  children,
}: {
  initial: string
  onChange: (markdown: string) => void
  onFailure: (failure: MarkdownFailure) => void
  children: ReactNode
}) {
  // Read once, before the editor exists: a text it can't read never opens.
  const [parsed] = useState(() =>
    parseMarkdown(createPlateEditor({ plugins: descriptionPlugins }), initial),
  )
  const unreadable = !parsed.ok
  // The editor opens with the cursor after the text, ready to add to it.
  const editor = usePlateEditor({
    plugins: descriptionPlugins,
    value: parsed.ok ? parsed.data : [],
    autoSelect: 'end',
  })
  // The text as Plate writes it on opening: the same string is no edit yet.
  const [opened] = useState(() => serializeMarkdown(editor))
  const edited = useRef(false)

  useEffect(() => {
    if (unreadable) onFailure('parse')
  }, [unreadable, onFailure])

  function changed() {
    const serialized = serializeMarkdown(editor)
    if (!serialized.ok) return onFailure('serialize')
    if (!edited.current && opened.ok && serialized.data === opened.data) return
    edited.current = true
    onChange(serialized.data)
  }

  if (unreadable) return null
  return (
    <Plate editor={editor} onValueChange={changed}>
      {children}
    </Plate>
  )
}

/** The text being edited, with the same looks as the formatted description. */
export function EditorText({
  className,
  ...props
}: ComponentProps<typeof PlateContent>) {
  return (
    <PlateContent
      {...props}
      className={cn(
        'mt-2 min-h-24 w-full rounded-[var(--field-radius)] border border-border bg-surface px-3 py-2 outline-none focus:border-foreground',
        'break-words [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-base [&_h2]:font-medium',
        '[&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5 [&>*+*]:mt-2',
        className,
      )}
    />
  )
}
