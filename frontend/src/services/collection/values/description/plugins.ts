import { BoldPlugin, H2Plugin, ItalicPlugin } from '@platejs/basic-nodes/react'
import { LinkPlugin } from '@platejs/link/react'
import { ListPlugin } from '@platejs/list-classic/react'
import { MarkdownPlugin } from '@platejs/markdown'
import { SlashInputPlugin, SlashPlugin } from '@platejs/slash-command/react'
import type { SlateEditor, Value } from 'platejs'
import { createPlateEditor } from 'platejs/react'
import remarkGfm from 'remark-gfm'
import { LinkElement } from './LinkElement'
import { SlashInput } from './SlashInput'

/**
 * The description editor's plugins: exactly the six toolbar features of spec 7.6
 * (bold, italic, heading, bullet list, numbered list, link), and Markdown in and out.
 * Headings are level 2, as the former Markdown toolbar wrote them. "/" at the start
 * of a word opens the menu of blocks (never saved: it leaves the text when closed).
 */
export const descriptionPlugins = [
  BoldPlugin,
  ItalicPlugin,
  H2Plugin,
  ListPlugin,
  LinkPlugin.withComponent(LinkElement),
  SlashPlugin,
  SlashInputPlugin.withComponent(SlashInput),
  MarkdownPlugin.configure({
    options: {
      remarkPlugins: [remarkGfm],
      // The marks the former Markdown toolbar wrote, so saved texts keep their look.
      remarkStringifyOptions: { bullet: '-', emphasis: '_', strong: '*' },
    },
  }),
]

/** A conversion's result: its data, or `ok: false` when it failed (never partial). */
export type Converted<T> = { ok: true; data: T } | { ok: false; error: unknown }

/** A Markdown text as the editor's content. */
export function parseMarkdown(
  editor: SlateEditor,
  markdown: string,
): Converted<Value> {
  try {
    const data = editor.getApi(MarkdownPlugin).markdown.deserialize(markdown)
    // Empty, one empty paragraph: where the cursor (and the placeholder) go.
    return {
      ok: true,
      data: data.length ? data : [{ type: 'p', children: [{ text: '' }] }],
    }
  } catch (error) {
    return { ok: false, error }
  }
}

/**
 * The editor's content as Markdown, without the trailing new line remark adds. Empty,
 * it is '' (Plate writes an empty paragraph as a zero-width space).
 */
export function serializeMarkdown(
  editor: SlateEditor,
  /** Part of the content (a selection's fragment); the whole content by default. */
  value?: Value,
): Converted<string> {
  try {
    const markdown = editor
      .getApi(MarkdownPlugin)
      .markdown.serialize(value ? { value } : undefined)
    // Judged on the text written, not the editor: an image alone holds no text.
    const empty = markdown.replace(/\u200b/g, '').trim() === ''
    return { ok: true, data: empty ? '' : markdown.replace(/\n+$/, '') }
  } catch (error) {
    return { ok: false, error }
  }
}

/** A detached editor holding a Markdown text (for the round-trip test). */
export function markdownEditor(markdown: string) {
  return createPlateEditor({
    plugins: descriptionPlugins,
    value: (editor) => {
      const parsed = parseMarkdown(editor, markdown)
      if (!parsed.ok) throw parsed.error
      return parsed.data
    },
  })
}

/** The editor's content as Markdown; throws if it can't be written (tests). */
export function toMarkdown(editor: SlateEditor) {
  const serialized = serializeMarkdown(editor)
  if (!serialized.ok) throw serialized.error
  return serialized.data
}
