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
 * A Markdown text shown and edited formatted (Plate, headless): Markdown in, Markdown
 * out through `onChange`, only after a real edit (opening never reports a change,
 * though Plate writes some marks its own way). A text it can't read shows `fallback`
 * and goes to `onFailure` once; one it can't write goes to `onFailure`, never as a
 * partial string. Its children (the toolbar, the `EditorText`) share the editor.
 */
export function PlateEditor({
  initial,
  onChange,
  onFailure,
  fallback,
  children,
}: {
  initial: string
  onChange: (markdown: string) => void
  onFailure: (failure: MarkdownFailure) => void
  /** Shown instead of the editor when the text can't be read. */
  fallback: ReactNode
  children: ReactNode
}) {
  // Read once, before the editor exists: a text it can't read never opens.
  const [parsed] = useState(() =>
    parseMarkdown(createPlateEditor({ plugins: descriptionPlugins }), initial),
  )
  const unreadable = !parsed.ok
  const editor = usePlateEditor({
    plugins: descriptionPlugins,
    value: parsed.ok ? parsed.data : [],
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

  if (unreadable) return fallback
  return (
    <Plate editor={editor} onValueChange={changed}>
      {children}
    </Plate>
  )
}

/**
 * The text, formatted, with the panel's looks: headings one step below the panel's
 * title, the editing cue under the pointer when it may be edited.
 */
export function EditorText({
  className,
  readOnly,
  ...props
}: ComponentProps<typeof PlateContent>) {
  return (
    <PlateContent
      {...props}
      readOnly={readOnly}
      className={cn(
        'min-w-0 break-words outline-none',
        !readOnly && 'cursor-text',
        '[&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-3 [&_blockquote]:text-muted',
        '[&_code]:rounded-[var(--field-radius)] [&_code]:bg-default [&_code]:px-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold',
        '[&_pre]:overflow-x-auto [&_pre]:rounded-[var(--field-radius)] [&_pre]:bg-default [&_pre]:px-3 [&_pre]:py-2 [&_pre]:font-mono [&_pre]:text-xs',
        '[&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5',
        '[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-start',
        '[&>*+*]:mt-2',
        className,
      )}
    />
  )
}
